import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchBonsCommande } from '../api/bonsCommande'
import { fetchLookup } from '../api/vehicles'
import type { BonCommande, LookupItem } from '../types'
import BonCommandeStatsCards from '../components/BonCommandeStatsCards'
import BonCommandeDetailDrawer from '../components/BonCommandeDetailDrawer'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'receptionne', label: 'Réceptionné(e)' },
  { value: 'en_attente', label: 'En attente' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n)

export default function BonsCommandePage() {
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
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['bons-commande', { search, statut, numFourn, numParc, article, page, pageSize }],
    queryFn: () =>
      fetchBonsCommande({
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

  const columns: ColumnsType<BonCommande> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 150 },
      {
        title: 'Date création',
        dataIndex: 'date_creation',
        key: 'date_creation',
        width: 130,
        render: fmtDate,
      },
      {
        title: 'Fournisseur',
        dataIndex: 'fournisseur',
        key: 'fournisseur',
        ellipsis: true,
        render: (v) => (v ? String(v).trim() : '—'),
      },
      { title: 'Parc', dataIndex: 'parc', key: 'parc', ellipsis: true, render: (v) => (v ? String(v).trim() : '—') },
      {
        title: 'Nb articles',
        dataIndex: 'nb_articles',
        key: 'nb_articles',
        width: 110,
        align: 'right',
        render: (v: number | null) => (v == null ? '—' : v.toLocaleString('fr-FR')),
      },
      {
        title: 'Montant (TND)',
        dataIndex: 'montant',
        key: 'montant',
        width: 130,
        align: 'right',
        render: fmtMoney,
      },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 150,
        render: (_v, r) =>
          r.statut ? (
            <Tag color={r.statut_code === 'receptionne' ? 'green' : 'orange'}>{r.statut}</Tag>
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
    setStatut(undefined)
    setNumFourn(undefined)
    setNumParc(undefined)
    setArticle(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Gestion des bons de commande
      </Title>

      <BonCommandeStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Référence ou fournisseur…"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut"
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
            placeholder="Fournisseur"
            style={{ width: 300 }}
            value={numFourn}
            filterOption={false}
            onSearch={setFournSearch}
            onChange={(v) => {
              setNumFourn(v)
              setPage(1)
            }}
            options={(fournisseurs ?? []).map((s: LookupItem) => ({
              value: String(s.value),
              label: String(s.label).trim(),
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Parc / UGP"
            style={{ width: 220 }}
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
            style={{ width: 300 }}
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
          <ExportButton resource="bons-commande" params={{ search, statut, num_fourn: numFourn, num_parc: numParc, article }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<BonCommande>
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
            showTotal: (t) => `${t.toLocaleString('fr-FR')} bons de commande`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <BonCommandeDetailDrawer
        reference={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
