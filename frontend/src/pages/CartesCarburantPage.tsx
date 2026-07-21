import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchCartesCarburant } from '../api/cartesCarburant'
import { fetchLookup } from '../api/vehicles'
import type { CarteCarburant, LookupItem, ValidityStatut } from '../types'
import { STATUT_META, STATUT_OPTIONS } from '../utils/statut'
import CarteCarburantStatsCards from '../components/CarteCarburantStatsCards'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'
import { useTableSort } from '../utils/useTableSort'

const { Title } = Typography
const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')

export default function CartesCarburantPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<ValidityStatut | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
  const [numParc, setNumParc] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { sort, order, onTableChange, sortable, reset: resetSort } = useTableSort(() => setPage(1))

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: structures } = useQuery({
    queryKey: ['lookup', 'structures', structSearch],
    queryFn: () => fetchLookup('structures', structSearch ? { search: structSearch } : undefined),
    staleTime: 60_000,
  })
  const { data: parcs } = useQuery({
    queryKey: ['lookup', 'parcs'],
    queryFn: () => fetchLookup('parcs'),
    staleTime: Infinity,
  })

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['cartes-carburant', { search, statut, numStruct, numParc, sort, order, page, pageSize }],
    queryFn: () =>
      fetchCartesCarburant({
        search: search || undefined,
        statut,
        num_struct: numStruct,
        num_parc: numParc,
        sort,
        order,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<CarteCarburant> = useMemo(
    () => [
      { title: 'N°', key: 'index', width: 55, render: (_v, _r, i) => (page - 1) * pageSize + i + 1 },
      { title: 'N° carte', dataIndex: 'num_caa', key: 'num_caa', width: 130 },
      {
        title: 'Structure', dataIndex: 'structure', key: 'structure', ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      { title: 'Titulaire', dataIndex: 'titulaire', key: 'titulaire', width: 160, ellipsis: true, render: (v) => v ?? '—' },
      { title: 'Station', dataIndex: 'station', key: 'station', width: 150, ellipsis: true, render: (v) => v ?? '—' },
      { title: 'Solde', dataIndex: 'solde', key: 'solde', width: 90, align: 'right', render: (v) => v ?? '—' },
      { title: 'Octroi', dataIndex: 'date_octroi', key: 'date_octroi', width: 120, render: fmtDate },
      { title: 'Expiration', dataIndex: 'date_expiration', key: 'date_expiration', width: 120, render: fmtDate },
      {
        title: 'Statut', dataIndex: 'statut', key: 'statut', width: 150,
        render: (s: ValidityStatut) => <Tag color={STATUT_META[s].color}>{STATUT_META[s].label}</Tag>,
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    resetSort()
    setSearchInput('')
    setSearch('')
    setStatut(undefined)
    setNumStruct(undefined)
    setNumParc(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Cartes carburant
      </Title>

      <CarteCarburantStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="N° carte, structure, titulaire…"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Statut de validité"
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
          <ExportButton resource="cartes-carburant" params={{ search, statut, num_struct: numStruct, num_parc: numParc, sort, order }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<CarteCarburant>
          rowKey="num_caa"
          size="middle"
          loading={isFetching}
          onChange={onTableChange}
          columns={sortable(columns, ['num_caa', 'structure', 'titulaire', 'station', 'solde', 'date_octroi', 'date_expiration', 'statut'])}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} cartes`,
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
