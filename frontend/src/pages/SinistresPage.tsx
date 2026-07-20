import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchSinistres } from '../api/sinistres'
import type { Sinistre } from '../types'
import SinistreStatsCards from '../components/SinistreStatsCards'
import SinistreDetailDrawer from '../components/SinistreDetailDrawer'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const NATURE_OPTIONS = [
  { value: 1, label: 'Accident' },
  { value: 2, label: 'Vol' },
  { value: 3, label: 'Incendie' },
  { value: 4, label: 'Autre' },
]
const STATUT_OPTIONS = [
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'clos', label: 'Clôturé' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n)

export default function SinistresPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [nature, setNature] = useState<number | undefined>()
  const [statut, setStatut] = useState<string | undefined>()
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['sinistres', { search, nature, statut, page, pageSize }],
    queryFn: () =>
      fetchSinistres({
        search: search || undefined,
        nature,
        statut,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Sinistre> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'N° sinistre', dataIndex: 'num_sin', key: 'num_sin', width: 120 },
      {
        title: 'Date',
        dataIndex: 'date_sinistre',
        key: 'date_sinistre',
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
      { title: 'Cause', dataIndex: 'cause', key: 'cause', width: 140, render: (v) => v ?? '—' },
      {
        title: 'Nature',
        dataIndex: 'nature',
        key: 'nature',
        width: 110,
        render: (v) =>
          v ? <Tag color={v === 'Accident' ? 'volcano' : 'purple'}>{v}</Tag> : '—',
      },
      {
        title: 'Mt. réparation',
        dataIndex: 'montant_rep',
        key: 'montant_rep',
        width: 120,
        align: 'right',
        render: fmtMoney,
      },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 110,
        render: (_v, r) =>
          r.statut ? (
            <Tag color={r.statut_code === 'ouvert' ? 'orange' : 'green'}>{r.statut}</Tag>
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
            onClick={() => setSelected(r.num_sin)}
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
    setStatut(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Gestion des assurances — Sinistres
      </Title>

      <SinistreStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="N° sinistre, plaque, cause, structure, tiers…"
            style={{ width: 340 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Nature"
            style={{ width: 150 }}
            value={nature}
            onChange={(v) => {
              setNature(v)
              setPage(1)
            }}
            options={NATURE_OPTIONS}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 150 }}
            value={statut}
            onChange={(v) => {
              setStatut(v)
              setPage(1)
            }}
            options={STATUT_OPTIONS}
          />
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
          <ExportButton resource="sinistres" params={{ search, nature, statut }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Sinistre>
          rowKey="num_sin"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} sinistres`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <SinistreDetailDrawer
        numSin={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
