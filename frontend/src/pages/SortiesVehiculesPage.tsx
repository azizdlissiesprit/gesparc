import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchBonsTravail } from '../api/bonsTravail'
import { fetchLookup } from '../api/vehicles'
import type { BonTravail, LookupItem } from '../types'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const ETAT_OPTIONS = [
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'cloturee', label: 'Clôturée' },
]

const fmtDateTime = (v: string | null) =>
  v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'

export default function SortiesVehiculesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [etat, setEtat] = useState<string | undefined>()
  const [numStruct, setNumStruct] = useState<string | undefined>()
  const [structSearch, setStructSearch] = useState('')
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['sorties', { search, etat, numStruct, page, pageSize }],
    queryFn: () =>
      fetchBonsTravail({
        search: search || undefined,
        etat,
        num_struct: numStruct,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<BonTravail> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 150 },
      { title: 'Parc', dataIndex: 'num_parc', key: 'num_parc', width: 90 },
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 110 },
      {
        title: "Date d'entrée",
        dataIndex: 'date_entree',
        key: 'date_entree',
        width: 160,
        render: fmtDateTime,
      },
      {
        title: 'Date sortie prévue',
        dataIndex: 'date_sortie_prev',
        key: 'date_sortie_prev',
        width: 160,
        render: fmtDateTime,
      },
      {
        title: 'Date sortie',
        dataIndex: 'date_sortie',
        key: 'date_sortie',
        width: 160,
        render: fmtDateTime,
      },
      {
        title: 'État',
        dataIndex: 'etat',
        key: 'etat',
        width: 120,
        render: (_v, r) =>
          r.etat ? (
            <Tag color={r.etat_code === 'ouverte' ? 'green' : 'default'}>{r.etat}</Tag>
          ) : (
            '—'
          ),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setEtat(undefined)
    setNumStruct(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Sorties des véhicules
      </Title>

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Référence, plaque, structure…"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            allowClear
            placeholder="État"
            style={{ width: 160 }}
            value={etat}
            onChange={(v) => {
              setEtat(v)
              setPage(1)
            }}
            options={ETAT_OPTIONS}
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
          <ExportButton resource="bons-travail" params={{ search, etat, num_struct: numStruct }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<BonTravail>
          rowKey="reference"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} sorties`,
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
