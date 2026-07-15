import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { fetchLookup, fetchVehicles } from '../api/vehicles'
import type { LookupItem, VehicleListItem } from '../types'
import { etatColor } from '../utils/etat'
import VehicleStatsCards from '../components/VehicleStatsCards'
import VehicleDetailDrawer from '../components/VehicleDetailDrawer'

const { Title } = Typography

const clean = (s: string | null | undefined) => (s ? s.trim() : '')

export default function VehiclesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [etat, setEtat] = useState<number | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<string | null>(null)

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: etats } = useQuery({
    queryKey: ['lookup', 'etats'],
    queryFn: () => fetchLookup('etats'),
    staleTime: Infinity,
  })

  const { data: structures } = useQuery({
    queryKey: ['lookup', 'structures', structSearch],
    queryFn: () =>
      fetchLookup('structures', structSearch ? { search: structSearch } : undefined),
    staleTime: 60_000,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['vehicles', { search, etat, numStruct, page, pageSize }],
    queryFn: () =>
      fetchVehicles({
        search: search || undefined,
        etat,
        num_struct: numStruct,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<VehicleListItem> = useMemo(
    () => [
      {
        title: 'Index',
        key: 'index',
        width: 70,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'N° plaque', dataIndex: 'num_plaque', key: 'num_plaque', width: 110 },
      {
        title: 'Marque',
        dataIndex: 'marque',
        key: 'marque',
        render: clean,
      },
      { title: 'Type', dataIndex: 'type', key: 'type', render: clean },
      { title: 'Genre', dataIndex: 'genre', key: 'genre', render: clean },
      {
        title: 'Énergie',
        dataIndex: 'energie',
        key: 'energie',
        width: 100,
        render: clean,
      },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
      },
      {
        title: 'Bénéficiaire',
        dataIndex: 'beneficiaire',
        key: 'beneficiaire',
        render: clean,
      },
      {
        title: 'État',
        dataIndex: 'etat',
        key: 'etat',
        width: 130,
        render: (_v, r) =>
          r.etat ? <Tag color={etatColor(r.etat_code)}>{r.etat}</Tag> : '—',
      },
      {
        title: '',
        key: 'actions',
        width: 100,
        render: (_v, r) => (
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => setSelected(r.num_veh)}
          >
            Détails
          </Button>
        ),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setEtat(undefined)
    setNumStruct(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Gestion des véhicules
      </Title>

      <VehicleStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Plaque, marque, structure, bénéficiaire…"
            style={{ width: 320 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="État"
            style={{ width: 180 }}
            value={etat}
            onChange={(v) => {
              setEtat(v)
              setPage(1)
            }}
            options={(etats ?? []).map((e: LookupItem) => ({
              value: Number(e.value),
              label: e.label,
            }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Structure"
            style={{ width: 300 }}
            value={numStruct}
            filterOption={false}
            onSearch={setStructSearch}
            onChange={(v) => {
              setNumStruct(v)
              setPage(1)
            }}
            options={(structures ?? []).map((s: LookupItem) => ({
              value: String(s.value),
              label: s.label,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<VehicleListItem>
          rowKey="num_veh"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} véhicules`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <VehicleDetailDrawer
        numVeh={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
