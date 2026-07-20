import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { fetchCarburant } from '../api/carburant'
import { fetchLookup } from '../api/vehicles'
import type { LigneCarburant, LookupItem } from '../types'
import { CATEGORIE_OPTIONS, categorieTag } from '../utils/categorie'
import CarburantStatsCards from '../components/CarburantStatsCards'
import CarburantDetailDrawer from '../components/CarburantDetailDrawer'
import ExportButton from '../components/ExportButton'

const { Title } = Typography

const clean = (s: string | null | undefined) => (s ? s.trim() : '—')
const num = (n: number | null, digits = 2) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n)
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')

export default function CarburantPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [energie, setEnergie] = useState<string | undefined>()
  const [annee, setAnnee] = useState<number | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [categorie, setCategorie] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<LigneCarburant | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: energies } = useQuery({
    queryKey: ['lookup', 'energies'],
    queryFn: () => fetchLookup('energies'),
    staleTime: Infinity,
  })
  const { data: annees } = useQuery({
    queryKey: ['lookup', 'carburant-annees'],
    queryFn: () => fetchLookup('carburant-annees'),
    staleTime: Infinity,
  })
  const { data: structures } = useQuery({
    queryKey: ['lookup', 'structures', structSearch],
    queryFn: () =>
      fetchLookup('structures', structSearch ? { search: structSearch } : undefined),
    staleTime: 60_000,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['carburant', { search, energie, annee, numStruct, categorie, page, pageSize }],
    queryFn: () =>
      fetchCarburant({
        search: search || undefined,
        energie,
        annee,
        num_struct: numStruct,
        categorie,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<LigneCarburant> = useMemo(
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
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 130, render: clean },
      {
        title: 'Type',
        dataIndex: 'categorie',
        key: 'categorie',
        width: 160,
        render: (c: string | null) => {
          const m = categorieTag(c)
          return <Tag color={m.color}>{m.label}</Tag>
        },
      },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      {
        title: 'Bénéficiaire',
        dataIndex: 'beneficiaire',
        key: 'beneficiaire',
        ellipsis: true,
        render: clean,
      },
      { title: 'Énergie', dataIndex: 'energie', key: 'energie', width: 100, render: clean },
      {
        title: 'Quantité (L)',
        dataIndex: 'quantite',
        key: 'quantite',
        width: 110,
        align: 'right',
        render: (v) => num(v, 2),
      },
      {
        title: 'Prix unit.',
        dataIndex: 'prix_unitaire',
        key: 'prix_unitaire',
        width: 100,
        align: 'right',
        render: (v) => num(v, 3),
      },
      {
        title: 'Montant (TND)',
        dataIndex: 'montant',
        key: 'montant',
        width: 130,
        align: 'right',
        render: (v) => num(v, 3),
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
            onClick={() => setSelected(r)}
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
    setEnergie(undefined)
    setAnnee(undefined)
    setNumStruct(undefined)
    setCategorie(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Carburant
      </Title>

      <CarburantStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Véhicule / bénéficiaire…"
            style={{ width: 260 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Type de matériel"
            style={{ width: 200 }}
            value={categorie}
            onChange={(v) => {
              setCategorie(v)
              setPage(1)
            }}
            options={CATEGORIE_OPTIONS}
          />
          <Select
            allowClear
            placeholder="Énergie"
            style={{ width: 150 }}
            value={energie}
            onChange={(v) => {
              setEnergie(v)
              setPage(1)
            }}
            options={(energies ?? []).map((e: LookupItem) => ({
              value: String(e.value),
              label: String(e.label).trim(),
            }))}
          />
          <Select
            allowClear
            placeholder="Année"
            style={{ width: 120 }}
            value={annee}
            onChange={(v) => {
              setAnnee(v)
              setPage(1)
            }}
            options={(annees ?? []).map((a: LookupItem) => ({
              value: Number(a.value),
              label: String(a.label),
            }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Structure"
            style={{ width: 280 }}
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
          <ExportButton resource="carburant" params={{ search, energie, annee, num_struct: numStruct, categorie }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<LigneCarburant>
          rowKey="id"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} transactions`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <CarburantDetailDrawer
        data={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
