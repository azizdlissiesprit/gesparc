import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import StatsRow, { ACCENT } from '../components/StatTile'
import dayjs from 'dayjs'
import {
  fetchReceptions,
  fetchReceptionBreakdown,
  fetchReceptionStats,
} from '../api/receptions'
import { fetchLookup } from '../api/vehicles'
import type { LookupItem, Reception } from '../types'
import BreakdownGrid from '../components/BreakdownGrid'
import ExportButton from '../components/ExportButton'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: '1', label: 'Sur commande' },
  { value: '0', label: 'Directe' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const num = (n: number | null, d = 3) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n)
const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function ReceptionsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<string | undefined>()
  const [numFourn, setNumFourn] = useState<string | undefined>()
  const [fournSearch, setFournSearch] = useState('')
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
    queryKey: ['recep-stats'],
    queryFn: fetchReceptionStats,
  })
  const { data: breakdown } = useQuery({
    queryKey: ['recep-breakdown'],
    queryFn: fetchReceptionBreakdown,
    staleTime: 60_000,
  })
  const { data: fournisseurs } = useQuery({
    queryKey: ['lookup', 'fournisseurs', fournSearch],
    queryFn: () =>
      fetchLookup('fournisseurs', fournSearch ? { search: fournSearch } : undefined),
    staleTime: 60_000,
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
    queryKey: ['receptions', { search, statut, numFourn, numParc, article, page, pageSize }],
    queryFn: () =>
      fetchReceptions({
        search: search || undefined,
        statut,
        num_fourn: numFourn,
        num_parc: numParc,
        article,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Reception> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 55,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Réception', dataIndex: 'num_piece', key: 'num_piece', width: 180 },
      { title: 'Date', dataIndex: 'date_piece', key: 'date_piece', width: 105, render: fmtDate },
      {
        title: 'Fournisseur',
        dataIndex: 'fournisseur',
        key: 'fournisseur',
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      { title: 'Réf. BC', dataIndex: 'ref_bc', key: 'ref_bc', width: 150, render: (v) => v ?? '—' },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 140,
        render: (_v, r) =>
          r.statut ? <Tag color={r.statut_code === 1 ? 'green' : 'default'}>{r.statut}</Tag> : '—',
      },
      {
        title: 'Parc / UGP',
        dataIndex: 'parc',
        key: 'parc',
        width: 170,
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
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
    setStatut(undefined)
    setNumFourn(undefined)
    setNumParc(undefined)
    setArticle(undefined)
    setPage(1)
  }

  const cards = [
    { label: 'Réceptions', value: int(stats?.total), icon: <InboxOutlined />, accent: ACCENT.neutral, hint: 'entrées en stock' },
    { label: 'Lignes', value: int(stats?.nb_lignes), icon: <UnorderedListOutlined />, accent: ACCENT.info, hint: "lignes d'article" },
    { label: 'Articles', value: int(stats?.nb_articles), icon: <TagsOutlined />, accent: ACCENT.violet, hint: 'références reçues' },
    { label: 'Fournisseurs', value: int(stats?.nb_fournisseurs), icon: <ShopOutlined />, accent: ACCENT.good, hint: 'fournisseurs livrant' },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Réceptions de fournisseur
      </Title>

      <StatsRow items={cards} loading={statsLoading} />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Réception, fournisseur, réf. BC…"
            style={{ width: 260 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 170 }}
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
            placeholder="Fournisseur"
            style={{ width: 280 }}
            value={numFourn}
            filterOption={false}
            onSearch={setFournSearch}
            onChange={(v) => {
              setNumFourn(v)
              setPage(1)
            }}
            options={(fournisseurs ?? []).map((f: LookupItem) => ({
              value: String(f.value),
              label: String(f.label).trim(),
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
          <ExportButton resource="receptions" params={{ search, statut, num_fourn: numFourn, num_parc: numParc, article }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Reception>
          rowKey="num_piece"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          scroll={{ x: 1150 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} réceptions`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <BreakdownGrid
        countLabel="Nb récep."
        span={8}
        specs={[
          { title: 'Par statut', header: 'Statut', rows: breakdown?.statut ?? [] },
          { title: 'Par parc / UGP', header: 'Parc / UGP', rows: breakdown?.parc ?? [] },
          { title: 'Par fournisseur (top 15)', header: 'Fournisseur', rows: breakdown?.fournisseur ?? [] },
        ]}
      />
    </div>
  )
}
