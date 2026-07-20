import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Row, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowLeftOutlined,
  CarOutlined,
  DashboardOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  FireOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import dayjs from 'dayjs'
import { fetchVehicle360 } from '../api/vehicle360'
import ChartCard from '../components/ChartCard'
import ChartTooltip from '../charts/ChartTooltip'
import ErrorState from '../components/ErrorState'
import StatsRow, { ACCENT } from '../components/StatTile'
import { CHART, cleanLabel, fmtInt, fmtMoneyShort } from '../charts/theme'
import { categorieTag } from '../utils/categorie'
import { etatColor } from '../utils/etat'
import type {
  BonTravail,
  Demande,
  Exploitation,
  LigneCarburant,
  OrdreMission,
  Sinistre,
} from '../types'

const { Title, Text } = Typography

const axisTick = { fill: CHART.muted, fontSize: 12 }
const d = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const n2 = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(v)

export default function Vehicle360Page() {
  const { numVeh = '' } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['vehicle-360', numVeh],
    queryFn: () => fetchVehicle360(numVeh),
    enabled: !!numVeh,
  })

  const v = data?.vehicule
  const k = data?.kpis

  const kpis = useMemo(
    () => [
      {
        label: 'Coût de maintenance',
        value: `${fmtMoneyShort(k?.cout_maintenance)} TND`,
        hint: `${fmtInt(k?.nb_bt)} bons de travail`,
        icon: <ToolOutlined />,
        accent: ACCENT.info,
      },
      {
        label: 'Coût par km',
        value: k?.cout_par_km != null ? `${n2(k.cout_par_km, 3)} TND` : '—',
        hint: 'maintenance / distance',
        icon: <DollarOutlined />,
        accent: ACCENT.warn,
      },
      {
        label: 'Consommation',
        value: k?.conso_moyenne != null ? `${n2(k.conso_moyenne)} L/100km` : '—',
        hint: 'médiane mensuelle',
        icon: <FireOutlined />,
        accent: ACCENT.bad,
      },
      {
        label: 'Km parcourus',
        value: fmtMoneyShort(k?.km_total),
        hint: 'mois plausibles',
        icon: <DashboardOutlined />,
        accent: ACCENT.good,
      },
      {
        label: 'Âge',
        value: v?.age_veh != null ? `${v.age_veh} ans` : '—',
        hint: 'depuis mise en service',
        icon: <FieldTimeOutlined />,
        accent: ACCENT.violet,
      },
      {
        label: 'Événements',
        value: fmtInt((k?.nb_demandes ?? 0) + (k?.nb_sinistres ?? 0) + (k?.nb_missions ?? 0)),
        hint: `${fmtInt(k?.nb_sinistres)} sinistre(s) · ${fmtInt(k?.nb_missions)} mission(s)`,
        icon: <CarOutlined />,
        accent: ACCENT.neutral,
      },
    ],
    [k, v],
  )

  if (isError) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicules')} style={{ marginBottom: 16 }}>
          Retour aux véhicules
        </Button>
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </div>
    )
  }

  // Client-side paging is correct here: unlike the main lists, the full set for
  // this one vehicle is already in hand (bounded server-side by `limite`).
  const paged = { pageSize: 10, size: 'small' as const, showSizeChanger: false }

  const btCols: ColumnsType<BonTravail> = [
    { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 150 },
    { title: 'Nature', dataIndex: 'nature', key: 'nature', width: 110 },
    {
      title: 'Mode', dataIndex: 'mode', key: 'mode', width: 100,
      render: (_x, r) => (r.mode ? <Tag color={r.mode_code === '1' ? 'geekblue' : 'orange'}>{r.mode}</Tag> : '—'),
    },
    { title: 'Entrée', dataIndex: 'date_entree', key: 'date_entree', width: 110, render: d },
    { title: 'Sortie', dataIndex: 'date_sortie', key: 'date_sortie', width: 110, render: d },
    { title: 'Coût (TND)', dataIndex: 'cout', key: 'cout', width: 120, align: 'right', render: (x) => n2(x, 3) },
  ]
  const demCols: ColumnsType<Demande> = [
    { title: 'Référence', dataIndex: 'reference', key: 'reference', width: 110 },
    { title: 'Date', dataIndex: 'date_demande', key: 'date_demande', width: 110, render: d },
    { title: 'Demandeur', dataIndex: 'demandeur', key: 'demandeur', width: 130 },
    { title: 'Statut', dataIndex: 'statut', key: 'statut', width: 120 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ]
  const carbCols: ColumnsType<LigneCarburant> = [
    { title: 'Date', dataIndex: 'date_piece', key: 'date_piece', width: 110, render: d },
    { title: 'Énergie', dataIndex: 'energie', key: 'energie', width: 110, render: cleanLabel },
    { title: 'Quantité (L)', dataIndex: 'quantite', key: 'quantite', width: 110, align: 'right', render: (x) => n2(x) },
    { title: 'Prix unit.', dataIndex: 'prix_unitaire', key: 'prix_unitaire', width: 100, align: 'right', render: (x) => n2(x, 3) },
    { title: 'Montant (TND)', dataIndex: 'montant', key: 'montant', width: 120, align: 'right', render: (x) => n2(x, 3) },
  ]
  const explCols: ColumnsType<Exploitation> = [
    { title: 'Année', dataIndex: 'annee', key: 'annee', width: 80 },
    { title: 'Mois', dataIndex: 'mois', key: 'mois', width: 70 },
    { title: 'Index KM', dataIndex: 'index_km', key: 'index_km', width: 110, align: 'right', render: (x) => n2(x, 0) },
    { title: 'Km parcourus', dataIndex: 'km_parcourus', key: 'km_parcourus', width: 120, align: 'right', render: (x) => n2(x, 0) },
    { title: 'Consommé (L)', dataIndex: 'carburant_consomme', key: 'carburant_consomme', width: 120, align: 'right', render: (x) => n2(x) },
    { title: 'Conso /100km', dataIndex: 'cmck', key: 'cmck', width: 120, align: 'right', render: (x) => n2(x) },
  ]
  const sinCols: ColumnsType<Sinistre> = [
    { title: 'N° sinistre', dataIndex: 'num_sin', key: 'num_sin', width: 130 },
    { title: 'Date', dataIndex: 'date_sinistre', key: 'date_sinistre', width: 110, render: d },
    { title: 'Nature', dataIndex: 'nature', key: 'nature', width: 110 },
    { title: 'Cause', dataIndex: 'cause', key: 'cause', ellipsis: true },
    { title: 'Réparation (TND)', dataIndex: 'montant_rep', key: 'montant_rep', width: 140, align: 'right', render: (x) => n2(x, 3) },
    { title: 'Statut', dataIndex: 'statut', key: 'statut', width: 110 },
  ]
  const omCols: ColumnsType<OrdreMission> = [
    { title: 'N° OM', dataIndex: 'num_om', key: 'num_om', width: 90 },
    { title: 'Conducteur', dataIndex: 'conducteur', key: 'conducteur', width: 150 },
    { title: 'Destination', dataIndex: 'destination', key: 'destination', ellipsis: true, render: (x) => <span dir="auto">{x ?? '—'}</span> },
    { title: 'Départ', dataIndex: 'date_depart', key: 'date_depart', width: 110, render: d },
    { title: 'Fin', dataIndex: 'date_fin', key: 'date_fin', width: 110, render: d },
    { title: 'Statut', dataIndex: 'statut', key: 'statut', width: 110 },
  ]

  const cat = categorieTag((v as { categorie?: string } | undefined)?.categorie)

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/vehicules')}
        style={{ marginBottom: 12 }}
      >
        Retour aux véhicules
      </Button>

      {isLoading ? (
        <Card style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space wrap align="center" size="middle">
              <Title level={3} style={{ margin: 0 }}>
                {cleanLabel(v?.num_plaque)}
              </Title>
              {v?.etat && <Tag color={etatColor(v.etat_code ?? undefined)}>{v.etat}</Tag>}
              {(v as { categorie?: string } | undefined)?.categorie && (
                <Tag color={cat.color}>{cat.label}</Tag>
              )}
            </Space>
            <Text type="secondary">
              {[cleanLabel(v?.marque_lib), cleanLabel(v?.type_lib), cleanLabel(v?.genre_lib)]
                .filter((x) => x && x !== '—')
                .join(' · ')}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <span dir="auto">{cleanLabel(v?.structure_lib)}</span>
              {v?.beneficiaire ? ` — ${cleanLabel(v.beneficiaire)}` : ''}
            </Text>
          </Space>
        </Card>
      )}

      <StatsRow items={kpis} loading={isLoading} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Coût de maintenance par année"
            subtitle="Dépense de réparation sur ce véhicule (TND)"
            loading={isLoading}
            empty={!data?.cout_par_annee.length}
            table={{
              dimension: 'Année',
              measure: 'Coût (TND)',
              rows: (data?.cout_par_annee ?? []).map((r) => ({
                key: r.annee, label: r.annee, value: fmtInt(r.cout),
              })),
            }}
          >
            <BarChart data={data?.cout_par_annee ?? []} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(x) => fmtMoneyShort(x)} width={52} />
              <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }} content={<ChartTooltip valueFmt={(x) => `${fmtInt(x)} TND`} />} />
              <Bar isAnimationActive={false} dataKey="cout" name="Coût" fill={CHART.blue} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            title="Km parcourus par année"
            subtitle="Mois plausibles uniquement (voir note sur les données)"
            loading={isLoading}
            empty={!data?.km_par_annee.length}
            table={{
              dimension: 'Année',
              measure: 'Km',
              rows: (data?.km_par_annee ?? []).map((r) => ({
                key: r.annee, label: r.annee, value: fmtInt(r.km),
              })),
            }}
          >
            <BarChart data={data?.km_par_annee ?? []} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(x) => fmtMoneyShort(x)} width={52} />
              <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }} content={<ChartTooltip valueFmt={(x) => `${fmtInt(x)} km`} />} />
              <Bar isAnimationActive={false} dataKey="km" name="Km" fill={CHART.aqua} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <Card styles={{ body: { padding: '0 16px 16px' } }}>
        <Tabs
          items={[
            {
              key: 'bt', label: `Bons de travail (${fmtInt(data?.bons_travail.length)})`,
              children: <Table<BonTravail> rowKey="reference" columns={btCols} dataSource={data?.bons_travail ?? []} loading={isLoading} pagination={paged} scroll={{ x: 760 }} />,
            },
            {
              key: 'dem', label: `Demandes (${fmtInt(data?.demandes.length)})`,
              children: <Table<Demande> rowKey="id" columns={demCols} dataSource={data?.demandes ?? []} loading={isLoading} pagination={paged} scroll={{ x: 760 }} />,
            },
            {
              key: 'carb', label: `Carburant (${fmtInt(data?.carburant.length)})`,
              children: <Table<LigneCarburant> rowKey="id" columns={carbCols} dataSource={data?.carburant ?? []} loading={isLoading} pagination={paged} scroll={{ x: 660 }} />,
            },
            {
              key: 'expl', label: `Exploitation (${fmtInt(data?.exploitation.length)})`,
              children: <Table<Exploitation> rowKey="id" columns={explCols} dataSource={data?.exploitation ?? []} loading={isLoading} pagination={paged} scroll={{ x: 700 }} />,
            },
            {
              key: 'sin', label: `Sinistres (${fmtInt(data?.sinistres.length)})`,
              children: <Table<Sinistre> rowKey="num_sin" columns={sinCols} dataSource={data?.sinistres ?? []} loading={isLoading} pagination={paged} scroll={{ x: 760 }} />,
            },
            {
              key: 'om', label: `Missions (${fmtInt(data?.missions.length)})`,
              children: <Table<OrdreMission> rowKey="num_om" columns={omCols} dataSource={data?.missions ?? []} loading={isLoading} pagination={paged} scroll={{ x: 760 }} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
