import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { fetchFournisseurs } from '../api/fournisseurs'
import type { Fournisseur } from '../types'
import FournisseurStatsCards from '../components/FournisseurStatsCards'
import FournisseurDetailDrawer from '../components/FournisseurDetailDrawer'
import ExportButton from '../components/ExportButton'
import { tableErrorLocale } from '../utils/tableLocale'

const { Title } = Typography

const STATUT_OPTIONS = [
  { value: 'actif', label: 'Actif' },
  { value: 'bloque', label: 'Bloqué' },
]

const clean = (s: string | null | undefined) => (s ? s.trim() : '—')

export default function FournisseursPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['fournisseurs', { search, statut, page, pageSize }],
    queryFn: () =>
      fetchFournisseurs({
        search: search || undefined,
        statut,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnsType<Fournisseur> = useMemo(
    () => [
      {
        title: 'N°',
        key: 'index',
        width: 60,
        render: (_v, _r, i) => (page - 1) * pageSize + i + 1,
      },
      { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
      {
        title: 'Désignation',
        dataIndex: 'designation',
        key: 'designation',
        ellipsis: true,
        render: clean,
      },
      { title: 'Activité', dataIndex: 'activite', key: 'activite', ellipsis: true, render: clean },
      { title: 'Adresse', dataIndex: 'adresse', key: 'adresse', ellipsis: true, render: clean },
      { title: 'Téléphone', dataIndex: 'tel', key: 'tel', width: 150, render: clean },
      {
        title: 'Statut',
        dataIndex: 'statut',
        key: 'statut',
        width: 100,
        render: (_v, r) =>
          r.statut ? <Tag color={r.bloque ? 'red' : 'green'}>{r.statut}</Tag> : '—',
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
    setStatut(undefined)
    setPage(1)
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Référentiel — Fournisseurs
      </Title>

      <FournisseurStatsCards />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Space wrap size="middle">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Code, désignation, activité, adresse…"
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
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Réinitialiser
          </Button>
          <ExportButton resource="fournisseurs" params={{ search, statut }} />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Fournisseur>
          rowKey="code"
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
            showTotal: (t) => `${t.toLocaleString('fr-FR')} fournisseurs`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <FournisseurDetailDrawer
        code={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
