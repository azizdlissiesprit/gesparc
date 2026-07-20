import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchMouvements } from '../api/mouvements'
import { fetchLookup } from '../api/vehicles'
import type { LookupItem, MouvementStock } from '../types'
import MvtStatsCards from '../components/MvtStatsCards'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'
import { useTableSort } from '../utils/useTableSort'

const { Title } = Typography

// Movement-type tag colour (1 = entrée, 2 = sortie, 3 = régularisation).
const TYPE_COLORS: Record<number, string> = { 1: 'green', 2: 'red', 3: 'blue' }

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const num = (n: number | null, digits = 2) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n)
const clean = (s: string | null | undefined) => (s ? String(s).trim() : '—')

export default function RegulationStockPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeMvt, setTypeMvt] = useState<number | undefined>()
  const [article, setArticle] = useState<string | undefined>()
  const [articleSearch, setArticleSearch] = useState('')
  const [numParc, setNumParc] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { sort, order, onTableChange, sortable, reset: resetSort } = useTableSort(
    () => setPage(1),
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: types } = useQuery({
    queryKey: ['lookup', 'mvt-types'],
    queryFn: () => fetchLookup('mvt-types'),
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['mouvements', { search, typeMvt, article, numParc, sort, order, page, pageSize }],
    queryFn: () =>
      fetchMouvements({
        search: search || undefined,
        type_mvt: typeMvt,
        article,
        num_parc: numParc,
        sort,
        order,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<MouvementStock> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      {
        title: 'Date',
        dataIndex: 'date_piece',
        key: 'date_piece',
        width: 110,
        render: fmtDate,
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (_v, r) =>
          r.type ? (
            <Tag color={TYPE_COLORS[r.type_code ?? 0] ?? 'default'}>{r.type}</Tag>
          ) : (
            '—'
          ),
      },
      { title: 'Code article', dataIndex: 'num_article', key: 'num_article', width: 130 },
      {
        title: 'Désignation',
        dataIndex: 'article',
        key: 'article',
        ellipsis: true,
        render: (v) => <span dir="auto">{clean(v)}</span>,
      },
      {
        title: 'Quantité',
        dataIndex: 'quantite',
        key: 'quantite',
        width: 100,
        align: 'right',
        render: (v) => num(v, 2),
      },
      {
        title: 'Parc / UGP',
        dataIndex: 'parc',
        key: 'parc',
        width: 180,
        ellipsis: true,
        render: (v) => <span dir="auto">{clean(v)}</span>,
      },
      {
        title: 'Bénéficiaire',
        dataIndex: 'beneficiaire',
        key: 'beneficiaire',
        ellipsis: true,
        render: (_v, r) => (
          <span dir="auto">
            {clean(r.beneficiaire)}
            {r.nat_benef ? <span style={{ color: '#8c8c8c' }}> · {r.nat_benef}</span> : null}
          </span>
        ),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    resetSort()
    setSearchInput('')
    setSearch('')
    setTypeMvt(undefined)
    setArticle(undefined)
    setNumParc(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Régulation du stock
      </Title>

      <MvtStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Code ou désignation article…"
            style={{ width: 280 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Type de mouvement"
            style={{ width: 200 }}
            value={typeMvt}
            onChange={(v) => {
              setTypeMvt(v)
              setPage(1)
            }}
            options={(types ?? []).map((t: LookupItem) => ({
              value: Number(t.value),
              label: t.label,
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
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
          <ExportButton resource="mouvements-stock" params={{ search, type_mvt: typeMvt, article, num_parc: numParc }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<MouvementStock>
          rowKey="id"
          size="middle"
          loading={isFetching}
          onChange={onTableChange}
          columns={sortable(columns, ['date_piece', 'type', 'num_article', 'article', 'quantite', 'parc', 'beneficiaire'])}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1150 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} mouvements`,
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
