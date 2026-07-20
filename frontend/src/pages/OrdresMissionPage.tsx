import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchOrdresMission } from '../api/ordresMission'
import { fetchLookup } from '../api/vehicles'
import type { LookupItem, OrdreMission } from '../types'
import OrdreMissionStatsCards from '../components/OrdreMissionStatsCards'
import OrdreMissionDetailDrawer from '../components/OrdreMissionDetailDrawer'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'
import { useTableSort } from '../utils/useTableSort'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')

export default function OrdresMissionPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<string | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { sort, order, onTableChange, sortable, reset: resetSort } = useTableSort(
    () => setPage(1),
  )
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: structures } = useQuery({
    queryKey: ['lookup', 'structures', structSearch],
    queryFn: () =>
      fetchLookup('structures', structSearch ? { search: structSearch } : undefined),
    staleTime: 60_000,
  })

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['ordres-mission', { search, statut, numStruct, sort, order, page, pageSize }],
    queryFn: () =>
      fetchOrdresMission({
        search: search || undefined,
        statut,
        num_struct: numStruct,
        sort,
        order,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<OrdreMission> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'N° OM', dataIndex: 'num_om', key: 'num_om', width: 110 },
      {
        title: 'Date départ',
        dataIndex: 'date_depart',
        key: 'date_depart',
        width: 120,
        render: fmtDate,
      },
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 110 },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      {
        title: 'Conducteur',
        dataIndex: 'conducteur',
        key: 'conducteur',
        width: 160,
        render: (v) => v ?? '—',
      },
      {
        title: 'Destination',
        dataIndex: 'destination',
        key: 'destination',
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 110,
        render: (_v, r) =>
          r.statut ? (
            <Tag color={r.statut_code === 'en_cours' ? 'orange' : 'green'}>{r.statut}</Tag>
          ) : (
            '—'
          ),
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
            onClick={() => setSelected(r.num_om)}
          >
            Détails
          </Button>
        ),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    resetSort()
    setSearchInput('')
    setSearch('')
    setStatut(undefined)
    setNumStruct(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Ordres de mission
      </Title>

      <OrdreMissionStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="N° OM, plaque, destination, conducteur…"
            style={{ width: 320 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 160 }}
            value={statut}
            onChange={(v) => {
              setStatut(v)
              setPage(1)
            }}
            options={STATUT_OPTIONS}
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
          <ExportButton resource="ordres-mission" params={{ search, statut, num_struct: numStruct }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<OrdreMission>
          rowKey="num_om"
          size="middle"
          loading={isFetching}
          onChange={onTableChange}
          columns={sortable(columns, ['num_om', 'num_plaque', 'structure', 'conducteur', 'destination', 'date_om', 'date_depart', 'date_fin', 'km_depart', 'km_retour', 'statut'])}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} ordres de mission`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <OrdreMissionDetailDrawer
        numOm={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
