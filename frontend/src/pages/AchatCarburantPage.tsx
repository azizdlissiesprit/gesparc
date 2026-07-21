import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchAchatsCarburant } from '../api/achatsCarburant'
import { fetchLookup } from '../api/vehicles'
import type { AchatCarburant, LookupItem } from '../types'
import AchatCarburantStatsCards from '../components/AchatCarburantStatsCards'
import AchatCarburantDetailDrawer from '../components/AchatCarburantDetailDrawer'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'
import { useTableSort } from '../utils/useTableSort'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'livre', label: 'Livré' },
  { value: 'en_attente', label: 'En attente' },
]
const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const fmtMoney = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n)
const int = (n: number | null) => (n == null ? '—' : n.toLocaleString('fr-FR'))

export default function AchatCarburantPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<string | undefined>()
  const [numFourn, setNumFourn] = useState<string | undefined>()
  const [fournSearch, setFournSearch] = useState('')
  const [numParc, setNumParc] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<string | null>(null)
  const { sort, order, onTableChange, sortable, reset: resetSort } = useTableSort(() => setPage(1))

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: fournisseurs } = useQuery({
    queryKey: ['lookup', 'fournisseurs', fournSearch],
    queryFn: () => fetchLookup('fournisseurs', fournSearch ? { search: fournSearch } : undefined),
    staleTime: 60_000,
  })
  const { data: parcs } = useQuery({
    queryKey: ['lookup', 'parcs'],
    queryFn: () => fetchLookup('parcs'),
    staleTime: Infinity,
  })

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['achats-carburant', { search, statut, numFourn, numParc, sort, order, page, pageSize }],
    queryFn: () =>
      fetchAchatsCarburant({
        search: search || undefined,
        statut,
        num_fourn: numFourn,
        num_parc: numParc,
        sort,
        order,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<AchatCarburant> = useMemo(
    () => [
      { title: 'N°', key: 'index', width: 60, render: (_v, _r, i) => (page - 1) * pageSize + i + 1 },
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 160 },
      { title: 'Date commande', dataIndex: 'date_commande', key: 'date_commande', width: 130, render: fmtDate },
      {
        title: 'Fournisseur', dataIndex: 'fournisseur', key: 'fournisseur', ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      {
        title: 'Parc / UGP', dataIndex: 'parc', key: 'parc', width: 170, ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      { title: 'Nb articles', dataIndex: 'nb_articles', key: 'nb_articles', width: 110, align: 'right', render: int },
      { title: 'Montant (TND)', dataIndex: 'montant', key: 'montant', width: 130, align: 'right', render: fmtMoney },
      {
        title: 'Statut', dataIndex: 'statut', key: 'statut', width: 120,
        render: (_v, r) => (r.statut ? <Tag color={r.statut_code === 'livre' ? 'green' : 'orange'}>{r.statut}</Tag> : '—'),
      },
      {
        title: '', key: 'actions', width: 100,
        render: (_v, r) => (
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setSelected(r.reference)}>
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
    setNumFourn(undefined)
    setNumParc(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Achat carburant
      </Title>

      <AchatCarburantStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Référence, fournisseur, marché…"
            style={{ width: 300 }}
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
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
          <ExportButton resource="achats-carburant" params={{ search, statut, num_fourn: numFourn, num_parc: numParc, sort, order }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<AchatCarburant>
          rowKey="reference"
          size="middle"
          loading={isFetching}
          onChange={onTableChange}
          columns={sortable(columns, ['reference', 'date_commande', 'fournisseur', 'parc', 'nb_articles', 'montant', 'statut'])}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} commandes`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <AchatCarburantDetailDrawer
        reference={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
