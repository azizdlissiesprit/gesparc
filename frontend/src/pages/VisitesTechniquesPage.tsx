import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchVisites } from '../api/visites'
import { fetchLookup } from '../api/vehicles'
import type { LookupItem, ValidityStatut, VisiteTechnique } from '../types'
import { STATUT_META, STATUT_OPTIONS } from '../utils/statut'
import VisiteStatsCards from '../components/VisiteStatsCards'
import ExportButton from '../components/ExportButton'

const { Title } = Typography

const fmtDate = (v: string | null) =>
  v ? dayjs(v).format('DD/MM/YYYY') : '—'
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR').format(n)

export default function VisitesTechniquesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<ValidityStatut | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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

  const { data, isFetching } = useQuery({
    queryKey: ['visites', { search, statut, numStruct, page, pageSize }],
    queryFn: () =>
      fetchVisites({
        search: search || undefined,
        statut,
        num_struct: numStruct,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<VisiteTechnique> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'N° plaque', dataIndex: 'num_plaque', key: 'num_plaque', width: 120 },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
      },
      {
        title: 'Début validité',
        dataIndex: 'date_debut',
        key: 'date_debut',
        width: 140,
        render: fmtDate,
      },
      {
        title: 'Fin validité',
        dataIndex: 'date_fin',
        key: 'date_fin',
        width: 140,
        render: fmtDate,
      },
      {
        title: 'Montant',
        dataIndex: 'montant',
        key: 'montant',
        width: 110,
        align: 'right',
        render: fmtMoney,
      },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 150,
        render: (s: ValidityStatut) => (
          <Tag color={STATUT_META[s].color}>{STATUT_META[s].label}</Tag>
        ),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatut(undefined)
    setNumStruct(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Gestion des visites techniques
      </Title>

      <VisiteStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Plaque ou structure…"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut de validité"
            style={{ width: 200 }}
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
          <ExportButton resource="visites-techniques" params={{ search, statut, num_struct: numStruct }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<VisiteTechnique>
          rowKey="id"
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
            showTotal: (t) => `${t.toLocaleString('fr-FR')} visites`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>
    </div>
  )
}
