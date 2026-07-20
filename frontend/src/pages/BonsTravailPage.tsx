import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchBonsTravail } from '../api/bonsTravail'
import { fetchLookup } from '../api/vehicles'
import type { BonTravail, LookupItem } from '../types'
import BonTravailStatsCards from '../components/BonTravailStatsCards'
import BonTravailDetailDrawer from '../components/BonTravailDetailDrawer'
import BtBreakdown from '../components/BtBreakdown'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const NATURE_OPTIONS = [
  { value: '1', label: 'Réparation' },
  { value: '3', label: 'Entretien' },
  { value: '2', label: 'Remorquage' },
]
const MODE_OPTIONS = [
  { value: '1', label: 'Interne' },
  { value: '2', label: 'Externe' },
]
const NATURE_COLOR: Record<string, string> = {
  '1': 'blue',
  '2': 'purple',
  '3': 'green',
}

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n)

export default function BonsTravailPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [nature, setNature] = useState<string | undefined>()
  const [mode, setMode] = useState<string | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<string | null>(null)

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
    queryKey: ['bons-travail', { search, nature, mode, numStruct, page, pageSize }],
    queryFn: () =>
      fetchBonsTravail({
        search: search || undefined,
        nature,
        mode,
        num_struct: numStruct,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<BonTravail> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 150 },
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 110 },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
      },
      {
        title: 'Nature',
        dataIndex: 'nature',
        key: 'nature',
        width: 120,
        render: (_v, r) =>
          r.nature ? (
            <Tag color={NATURE_COLOR[r.nature_code ?? ''] ?? 'default'}>{r.nature}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: 'Mode',
        dataIndex: 'mode',
        key: 'mode',
        width: 100,
        render: (_v, r) =>
          r.mode ? (
            <Tag color={r.mode_code === '1' ? 'geekblue' : 'orange'}>{r.mode}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: "Date d'entrée",
        dataIndex: 'date_entree',
        key: 'date_entree',
        width: 130,
        render: fmtDate,
      },
      {
        title: 'Date sortie',
        dataIndex: 'date_sortie',
        key: 'date_sortie',
        width: 130,
        render: fmtDate,
      },
      {
        title: 'Coût (TND)',
        dataIndex: 'cout',
        key: 'cout',
        width: 120,
        align: 'right',
        render: fmtMoney,
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
            onClick={() => setSelected(r.reference)}
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
    setNature(undefined)
    setMode(undefined)
    setNumStruct(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Gestion des bons de travail
      </Title>

      <BonTravailStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Référence, plaque, structure…"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Nature"
            style={{ width: 160 }}
            value={nature}
            onChange={(v) => {
              setNature(v)
              setPage(1)
            }}
            options={NATURE_OPTIONS}
          />
          <Select
            allowClear
            placeholder="Mode"
            style={{ width: 140 }}
            value={mode}
            onChange={(v) => {
              setMode(v)
              setPage(1)
            }}
            options={MODE_OPTIONS}
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
          <ExportButton resource="bons-travail" params={{ search, nature, mode, num_struct: numStruct }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<BonTravail>
          rowKey="reference"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1150 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} bons de travail`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <BtBreakdown />

      <BonTravailDetailDrawer
        reference={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
