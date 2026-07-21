import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { fetchEmprunts } from '../api/emprunts'
import type { Emprunt } from '../types'
import EmpruntStatsCards from '../components/EmpruntStatsCards'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'
import { useTableSort } from '../utils/useTableSort'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'retourne', label: 'Retourné' },
]
const fmtDate = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')

export default function EmpruntsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<string | undefined>()
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['emprunts', { search, statut, sort, order, page, pageSize }],
    queryFn: () =>
      fetchEmprunts({
        search: search || undefined,
        statut,
        sort,
        order,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Emprunt> = useMemo(
    () => [
      { title: 'N°', key: 'index', width: 55, render: (_v, _r, i) => (page - 1) * pageSize + i + 1 },
      { title: 'N° emprunt', dataIndex: 'num_emp', key: 'num_emp', width: 140 },
      { title: 'Véhicule', dataIndex: 'num_plaque', key: 'num_plaque', width: 120 },
      {
        title: 'Bénéficiaire', dataIndex: 'beneficiaire', key: 'beneficiaire', ellipsis: true,
        render: (v) => <span dir="auto">{v ?? '—'}</span>,
      },
      { title: 'Agent', dataIndex: 'agent', key: 'agent', width: 160, ellipsis: true, render: (v) => v ?? '—' },
      { title: 'Début', dataIndex: 'date_debut', key: 'date_debut', width: 120, render: fmtDate },
      { title: 'Fin prévue', dataIndex: 'date_fin', key: 'date_fin', width: 120, render: fmtDate },
      { title: 'Retour', dataIndex: 'date_retour', key: 'date_retour', width: 120, render: fmtDate },
      {
        title: 'Statut', dataIndex: 'statut', key: 'statut', width: 120,
        render: (_v, r) => (r.statut ? <Tag color={r.statut_code === 'en_cours' ? 'orange' : 'green'}>{r.statut}</Tag> : '—'),
      },
    ],
    [page, pageSize],
  )

  const resetFilters = () => {
    resetSort()
    setSearchInput('')
    setSearch('')
    setStatut(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Emprunts de véhicules
      </Title>

      <EmpruntStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="N° emprunt, plaque, bénéficiaire…"
            style={{ width: 320 }}
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
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
          <ExportButton resource="emprunts" params={{ search, statut, sort, order }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Emprunt>
          rowKey="num_emp"
          size="middle"
          loading={isFetching}
          onChange={onTableChange}
          columns={sortable(columns, ['num_emp', 'num_plaque', 'beneficiaire', 'agent', 'date_debut', 'date_fin', 'date_retour', 'statut'])}
          dataSource={data?.results ?? []}
          locale={tableErrorLocale(isError ? error : undefined, refetch)}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t.toLocaleString('fr-FR')} emprunts`,
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
