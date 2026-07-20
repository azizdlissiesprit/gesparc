import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { fetchArticles } from '../api/articles'
import { fetchLookup } from '../api/vehicles'
import type { Article, LookupItem } from '../types'
import ArticleStatsCards from '../components/ArticleStatsCards'
import ArticleDetailDrawer from '../components/ArticleDetailDrawer'
import ExportButton from '../components/ExportButton'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'en_stock', label: 'En stock' },
  { value: 'rupture', label: 'En rupture' },
]

const clean = (s: string | null | undefined) => (s ? s.trim() : '—')
const fmtNum = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n)

export default function StockArticlesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [marque, setMarque] = useState<number | undefined>()
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

  const { data: marques } = useQuery({
    queryKey: ['lookup', 'marques'],
    queryFn: () => fetchLookup('marques'),
    staleTime: Infinity,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['articles', { search, marque, statut, page, pageSize }],
    queryFn: () =>
      fetchArticles({
        search: search || undefined,
        marque,
        statut,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Article> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
      {
        title: 'Désignation',
        dataIndex: 'designation',
        key: 'designation',
        ellipsis: true,
        render: clean,
      },
      {
        title: 'Réf. constructeur',
        dataIndex: 'ref_constructeur',
        key: 'ref_constructeur',
        width: 140,
        render: clean,
      },
      { title: 'Marque', dataIndex: 'marque', key: 'marque', width: 120, render: clean },
      { title: 'Type', dataIndex: 'type', key: 'type', width: 100, render: clean },
      {
        title: 'Qté stock',
        dataIndex: 'qte_stock',
        key: 'qte_stock',
        width: 100,
        align: 'right',
        render: (v: number | null) => (
          <span style={{ color: Number(v ?? 0) > 0 ? undefined : '#cf1322' }}>
            {fmtNum(v)}
          </span>
        ),
      },
      {
        title: 'Prix initial',
        dataIndex: 'prix',
        key: 'prix',
        width: 110,
        align: 'right',
        render: fmtNum,
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
            onClick={() => setSelected(r.code)}
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
    setMarque(undefined)
    setStatut(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Stock — Articles
      </Title>

      <ArticleStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Code, désignation, réf. constructeur…"
            style={{ width: 320 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Marque"
            style={{ width: 200 }}
            value={marque}
            onChange={(v) => {
              setMarque(v)
              setPage(1)
            }}
            options={(marques ?? []).map((m: LookupItem) => ({
              value: Number(m.value),
              label: String(m.label).trim(),
            }))}
          />
          <Select
            allowClear
            placeholder="Statut stock"
            style={{ width: 160 }}
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
          <ExportButton resource="articles" params={{ search, marque, statut }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Article>
          rowKey="code"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} articles`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <ArticleDetailDrawer
        code={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
