import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Card,
  Col,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Button,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fetchBonsSortie,
  fetchBonSortieBreakdown,
  fetchBonSortieStats,
} from '../api/bonsSortie'
import { fetchLookup } from '../api/vehicles'
import type { BonSortie, LookupItem } from '../types'
import BreakdownGrid from '../components/BreakdownGrid'

const { Title } = Typography

const MODE_OPTIONS = [
  { value: '1', label: 'Interne' },
  { value: '2', label: 'Externe' },
]
const STATUT_OPTIONS = [
  { value: '1', label: 'Clôturé' },
  { value: '0', label: 'Non clôturé' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const num = (n: number | null, d = 3) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n)
const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function BonsSortiePage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<string | undefined>()
  const [statut, setStatut] = useState<string | undefined>()
  const [numMag, setNumMag] = useState<string | undefined>()
  const [numParc, setNumParc] = useState<string | undefined>()
  const [article, setArticle] = useState<string | undefined>()
  const [articleSearch, setArticleSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['bs-stats'],
    queryFn: fetchBonSortieStats,
  })
  const { data: breakdown } = useQuery({
    queryKey: ['bs-breakdown'],
    queryFn: fetchBonSortieBreakdown,
    staleTime: 60_000,
  })
  const { data: magasins } = useQuery({
    queryKey: ['lookup', 'magasins'],
    queryFn: () => fetchLookup('magasins'),
    staleTime: Infinity,
  })
  const { data: parcs } = useQuery({
    queryKey: ['lookup', 'parcs'],
    queryFn: () => fetchLookup('parcs'),
    staleTime: Infinity,
  })
  const { data: articles } = useQuery({
    queryKey: ['lookup', 'articles', articleSearch],
    queryFn: () =>
      fetchLookup('articles', articleSearch ? { search: articleSearch } : undefined),
    staleTime: 60_000,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['bons-sortie', { search, mode, statut, numMag, numParc, article, page, pageSize }],
    queryFn: () =>
      fetchBonsSortie({
        search: search || undefined,
        mode,
        statut,
        num_mag: numMag,
        num_parc: numParc,
        article,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<BonSortie> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 55,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Bon de sortie', dataIndex: 'num_piece', key: 'num_piece', width: 180 },
      { title: 'Date', dataIndex: 'date_piece', key: 'date_piece', width: 105, render: fmtDate },
      { title: 'Bon de travail', dataIndex: 'num_bt_int', key: 'num_bt_int', width: 150 },
      {
        title: 'Mode',
        dataIndex: 'mode',
        key: 'mode',
        width: 100,
        render: (_v, r) =>
          r.mode ? <Tag color={r.mode_code === '1' ? 'geekblue' : 'orange'}>{r.mode}</Tag> : '—',
      },
      {
        title: 'Magasin',
        dataIndex: 'magasin',
        key: 'magasin',
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      { title: 'Série véhicule', dataIndex: 'num_veh', key: 'num_veh', width: 150, ellipsis: true },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 120,
        render: (_v, r) =>
          r.statut ? <Tag color={r.cloture_code === 1 ? 'green' : 'orange'}>{r.statut}</Tag> : '—',
      },
      {
        title: 'Nb articles',
        dataIndex: 'nb_articles',
        key: 'nb_articles',
        width: 100,
        align: 'right',
        render: (v: number) => int(v),
      },
      {
        title: 'Montant (TND)',
        dataIndex: 'montant',
        key: 'montant',
        width: 120,
        align: 'right',
        render: (v) => num(v, 3),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setMode(undefined)
    setStatut(undefined)
    setNumMag(undefined)
    setNumParc(undefined)
    setArticle(undefined)
    setPage(1)
  }

  const cards = [
    { title: 'Bons de sortie', value: int(stats?.total) },
    { title: 'Lignes', value: int(stats?.nb_lignes) },
    { title: 'Articles', value: int(stats?.nb_articles) },
    { title: 'Bons de travail', value: int(stats?.nb_bt) },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Bons de sortie (pour bons de travail)
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {cards.map((c) => (
          <Col xs={12} md={6} key={c.title}>
            <Card>
              {statsLoading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic title={c.title} value={c.value} />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Bon, BT ou série véhicule…"
            style={{ width: 260 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Mode"
            style={{ width: 150 }}
            value={mode}
            onChange={(v) => {
              setMode(v)
              setPage(1)
            }}
            options={MODE_OPTIONS}
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
            optionFilterProp="label"
            placeholder="Magasin"
            style={{ width: 220 }}
            value={numMag}
            onChange={(v) => {
              setNumMag(v)
              setPage(1)
            }}
            options={(magasins ?? []).map((m: LookupItem) => ({
              value: String(m.value),
              label: String(m.label).trim(),
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Parc / UGP"
            style={{ width: 200 }}
            value={numParc}
            onChange={(v) => {
              setNumParc(v)
              setPage(1)
            }}
            options={(parcs ?? []).map((p: LookupItem) => ({
              value: String(p.value),
              label: String(p.label).trim(),
            }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Article"
            style={{ width: 280 }}
            value={article}
            filterOption={false}
            onSearch={setArticleSearch}
            onChange={(v) => {
              setArticle(v)
              setPage(1)
            }}
            options={(articles ?? []).map((a: LookupItem) => ({
              value: String(a.value),
              label: `${String(a.value)} — ${String(a.label).trim()}`,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<BonSortie>
          rowKey="num_piece"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          scroll={{ x: 1250 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} bons de sortie`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <BreakdownGrid
        countLabel="Nb bons"
        specs={[
          { title: 'Par mode', header: 'Mode', rows: breakdown?.mode ?? [] },
          { title: 'Par statut', header: 'Statut', rows: breakdown?.statut ?? [] },
          { title: 'Par magasin', header: 'Magasin', rows: breakdown?.magasin ?? [] },
          { title: 'Par UGP', header: 'Parc / UGP', rows: breakdown?.ugp ?? [] },
        ]}
      />
    </div>
  )
}
