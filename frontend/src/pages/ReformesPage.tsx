import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchReformes } from '../api/reformes'
import { fetchLookup } from '../api/vehicles'
import type { LookupItem, ReformeLigne, ReformeStatut } from '../types'
import ReformeStatsCards from '../components/ReformeStatsCards'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const STATUT_META: Record<ReformeStatut, { label: string; color: string }> = {
  vendu: { label: 'Vendu', color: 'blue' },
  non_vendu: { label: 'Non vendu', color: 'orange' },
}
const STATUT_OPTIONS = [
  { value: 'vendu', label: 'Vendu' },
  { value: 'non_vendu', label: 'Non vendu' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR').format(n)

export default function ReformesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<ReformeStatut | undefined>()
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['reformes', { search, statut, numStruct, page, pageSize }],
    queryFn: () =>
      fetchReformes({
        search: search || undefined,
        statut,
        num_struct: numStruct,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<ReformeLigne> = useMemo(
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
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 120 },
      {
        title: 'Date réforme',
        dataIndex: 'date_reforme',
        key: 'date_reforme',
        width: 130,
        render: fmtDate,
      },
      {
        title: 'Date vente',
        dataIndex: 'date_vente',
        key: 'date_vente',
        width: 130,
        render: fmtDate,
      },
      {
        title: 'Prix vente',
        dataIndex: 'prix_vente',
        key: 'prix_vente',
        width: 110,
        align: 'right',
        render: fmtMoney,
      },
      {
        title: 'Cause',
        dataIndex: 'cause',
        key: 'cause',
        ellipsis: true,
      },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 120,
        render: (s: ReformeStatut) => (
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
        Gestion des réformes
      </Title>

      <ReformeStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Plaque, référence, structure, cause…"
            style={{ width: 340 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 180 }}
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
          <ExportButton resource="reformes" params={{ search, statut, num_struct: numStruct }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<ReformeLigne>
          rowKey="id"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} réformes`,
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
