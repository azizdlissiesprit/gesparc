import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchDemandes, fetchDemandesParUgp } from '../api/demandes'
import { fetchLookup } from '../api/vehicles'
import type { Demande, DemandeParUgp, LookupItem } from '../types'
import DemandeStatsCards from '../components/DemandeStatsCards'

const { Title } = Typography

const STATUT_META: Record<string, { label: string; color: string }> = {
  '0': { label: 'En attente', color: 'orange' },
  '1': { label: 'Finis', color: 'green' },
  '2': { label: 'Refusé', color: 'red' },
}
const STATUT_OPTIONS = [
  { value: '1', label: 'Finis' },
  { value: '0', label: 'En attente' },
  { value: '2', label: 'Refusé' },
]

const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')

export default function DemandesInterventionPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<string | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [numParc, setNumParc] = useState<string | undefined>()
  const [genre, setGenre] = useState<string | undefined>()
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
  const { data: parcs } = useQuery({
    queryKey: ['lookup', 'parcs'],
    queryFn: () => fetchLookup('parcs'),
    staleTime: Infinity,
  })
  const { data: genres } = useQuery({
    queryKey: ['lookup', 'genres'],
    queryFn: () => fetchLookup('genres'),
    staleTime: Infinity,
  })
  const { data: parUgp } = useQuery({
    queryKey: ['demandes-par-ugp'],
    queryFn: fetchDemandesParUgp,
    staleTime: 60_000,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['demandes', { search, statut, numStruct, numParc, genre, page, pageSize }],
    queryFn: () =>
      fetchDemandes({
        search: search || undefined,
        statut,
        num_struct: numStruct,
        num_parc: numParc,
        genre,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Demande> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 110 },
      {
        title: 'Date demande',
        dataIndex: 'date_demande',
        key: 'date_demande',
        width: 130,
        render: fmtDate,
      },
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 110 },
      {
        title: 'Structure',
        dataIndex: 'structure',
        key: 'structure',
        ellipsis: true,
      },
      {
        title: 'Parc / UGP',
        dataIndex: 'parc',
        key: 'parc',
        width: 170,
        ellipsis: true,
        render: (v) => (v ? String(v).trim() : '—'),
      },
      {
        title: 'Type véhicule',
        dataIndex: 'genre',
        key: 'genre',
        width: 140,
        render: (v) => (v ? <Tag>{String(v).trim()}</Tag> : '—'),
      },
      { title: 'Demandeur', dataIndex: 'demandeur', key: 'demandeur', width: 120 },
      {
        title: 'Statut',
        dataIndex: 'statut_code',
        key: 'statut',
        width: 120,
        render: (code: string) =>
          STATUT_META[code] ? (
            <Tag color={STATUT_META[code].color}>{STATUT_META[code].label}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: 'Rendez-vous',
        dataIndex: 'date_rdv',
        key: 'date_rdv',
        width: 130,
        render: fmtDate,
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatut(undefined)
    setNumStruct(undefined)
    setNumParc(undefined)
    setGenre(undefined)
    setPage(1)
  }

  const parUgpColumns: ColumnsType<DemandeParUgp> = [
    {
      title: 'Parc / UGP',
      dataIndex: 'parc',
      key: 'parc',
      render: (v, r) => `${v ?? '—'}${r.num_parc ? ` (${r.num_parc})` : ''}`,
    },
    { title: 'En attente', dataIndex: 'en_attente', key: 'en_attente', width: 120, align: 'right' },
    { title: 'Finis', dataIndex: 'finis', key: 'finis', width: 110, align: 'right' },
    { title: 'Refusé', dataIndex: 'refuses', key: 'refuses', width: 110, align: 'right' },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right',
      render: (v: number) => <b>{v.toLocaleString('fr-FR')}</b>,
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Demandes d'intervention
      </Title>

      <DemandeStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Référence, plaque, structure, demandeur…"
            style={{ width: 320 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
            optionFilterProp="label"
            placeholder="Type véhicule"
            style={{ width: 180 }}
            value={genre}
            onChange={(v) => {
              setGenre(v)
              setPage(1)
            }}
            options={(genres ?? []).map((g: LookupItem) => ({
              value: String(g.value),
              label: String(g.label).trim(),
            }))}
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
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Demande>
          rowKey="id"
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
            showTotal: (t) => `${t.toLocaleString('fr-FR')} demandes`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <Card
        title="Répartition des statuts par UGP"
        style={{ marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<DemandeParUgp>
          rowKey={(r) => r.num_parc ?? '—'}
          size="small"
          columns={parUgpColumns}
          dataSource={parUgp ?? []}
          pagination={false}
          scroll={{ x: 640, y: 360 }}
        />
      </Card>
    </div>
  )
}
