import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Skeleton, Empty, Typography } from 'antd'
import {
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'
import { fetchOverview } from '../api/overview'
import ChartTooltip from '../charts/ChartTooltip'
import {
  CHART,
  ETAT_CHART_COLORS,
  NATURE_CHART_COLORS,
  cleanLabel,
  fmtInt,
  fmtMoneyShort,
} from '../charts/theme'

const { Title, Text } = Typography

const axisTick = { fill: CHART.muted, fontSize: 12 }
const COMPOSITION_COLORS = [CHART.blue, CHART.aqua, CHART.yellow]

// Shorten the long official structure names for chart axes.
const shortStruct = (s: string | null | undefined) => {
  const short = cleanLabel(s)
    .replace(/^[ًٌٍَُِّْ]+/, '') // strip stray Arabic diacritics prefix
    .replace(/^Direction Régionale de\s+/i, 'DR ')
    .replace(/^Direction Régionale d['’]/i, 'DR ')
    .replace(/^Direction Centrale\s+/i, 'DC ')
    .replace(/^Direction Exécutive\s+/i, 'DE ')
    .replace(/^Division\s+/i, 'Div. ')
    .replace(/^Direction\s+/i, 'Dir. ')
  return short.length > 20 ? `${short.slice(0, 19)}…` : short
}

function KpiCard({
  icon,
  accent,
  title,
  value,
  subtitle,
  loading,
}: {
  icon: ReactNode
  accent: string
  title: string
  value: string
  subtitle: string
  loading: boolean
}) {
  return (
    <Card styles={{ body: { padding: 18 } }}>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${accent}1a`,
              color: accent,
              fontSize: 22,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: CHART.muted, fontSize: 13 }}>{title}</div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: CHART.ink }}>
              {value}
            </div>
            <div style={{ color: CHART.inkSecondary, fontSize: 12 }}>{subtitle}</div>
          </div>
        </div>
      )}
    </Card>
  )
}

function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  height = 300,
  children,
}: {
  title: string
  subtitle?: string
  loading: boolean
  empty?: boolean
  height?: number
  children: ReactNode
}) {
  return (
    <Card
      title={
        <div style={{ lineHeight: 1.3, padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, fontWeight: 400, color: CHART.muted }}>{subtitle}</div>
          )}
        </div>
      }
      styles={{ body: { padding: 16, height } }}
    >
      {loading ? (
        <Skeleton active />
      ) : empty ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    staleTime: 60_000,
  })

  const k = data?.kpis
  const etat = (data?.parc_par_etat ?? []).map((e) => ({ ...e, name: e.etat }))
  const nature = (data?.bt_par_nature ?? []).map((n) => ({ ...n, name: n.nature }))
  const genre = (data?.parc_par_genre ?? []).map((g) => ({ name: cleanLabel(g.genre), n: g.n }))
  const energie = (data?.parc_par_energie ?? []).map((e) => ({
    name: cleanLabel(e.energie),
    n: e.n,
  }))
  const structures = (data?.top_structures ?? []).map((s) => ({
    name: shortStruct(s.structure),
    n: s.n,
  }))
  const cout = data?.cout_maintenance_par_annee ?? []
  const cc = data?.cout_composition
  const composition = cc
    ? [
        { name: 'Pièces', value: cc.pieces },
        { name: "Main d'œuvre", value: cc.main_oeuvre },
        { name: 'Réparation externe', value: cc.externe },
      ]
    : []

  const kpis = [
    {
      icon: <CarOutlined />,
      accent: '#2a78d6',
      title: 'Parc total',
      value: fmtInt(k?.vehicules_total),
      subtitle: 'véhicules immatriculés',
    },
    {
      icon: <CheckCircleOutlined />,
      accent: '#008300',
      title: 'En circulation',
      value: fmtInt(k?.en_circulation),
      subtitle: `${k?.disponibilite ?? 0}% du parc`,
    },
    {
      icon: <FieldTimeOutlined />,
      accent: '#4a3aa7',
      title: 'Âge moyen du parc',
      value: k?.age_moyen != null ? `${k.age_moyen} ans` : '—',
      subtitle: 'signal de renouvellement',
    },
    {
      icon: <WalletOutlined />,
      accent: '#096dd9',
      title: 'Coût de maintenance',
      value: `${fmtMoneyShort(k?.cout_maintenance_total)} TND`,
      subtitle: 'cumulé, tous bons de travail',
    },
    {
      icon: <DollarOutlined />,
      accent: '#d46b08',
      title: 'Coût moyen / véhicule',
      value: `${fmtInt(k?.cout_moyen_vehicule)} TND`,
      subtitle: 'maintenance par véhicule',
    },
    {
      icon: <ToolOutlined />,
      accent: '#1baf7a',
      title: 'Bons de travail',
      value: fmtInt(k?.bons_travail_total),
      subtitle: 'interventions enregistrées',
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        Tableau de bord
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Vue d'ensemble du parc, de la maintenance et des coûts — Tunisie Telecom
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {kpis.map((c) => (
          <Col xs={12} sm={12} md={8} lg={4} key={c.title}>
            <KpiCard {...c} loading={isLoading} />
          </Col>
        ))}
      </Row>

      {/* Maintenance cost trend + cost structure */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={15}>
          <ChartCard
            title="Coût de maintenance par année"
            subtitle="Dépense de réparation et volume d'interventions (années complètes)"
            loading={isLoading}
            empty={!cout.length}
          >
            <ComposedChart data={cout} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="cout"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtMoneyShort(v)}
                width={48}
              />
              <YAxis
                yAxisId="nb"
                orientation="right"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={(v) => fmtInt(v)} />}
              />
              <Legend
                iconType="circle"
                formatter={(v) => <span style={{ color: CHART.inkSecondary }}>{v}</span>}
              />
              <Bar
                yAxisId="cout"
                isAnimationActive={false}
                dataKey="cout"
                name="Coût (TND)"
                fill={CHART.blue}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
              <Line
                yAxisId="nb"
                isAnimationActive={false}
                type="monotone"
                dataKey="nombre"
                name="Interventions"
                stroke={CHART.yellow}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.yellow, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={9}>
          <ChartCard
            title="Répartition du coût de maintenance"
            subtitle="Pièces · main d'œuvre · réparation externe"
            loading={isLoading}
            empty={!composition.length}
          >
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={composition}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
                label={(p: { percent?: number }) => `${Math.round((p.percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {composition.map((_, i) => (
                  <Cell key={i} fill={COMPOSITION_COLORS[i % COMPOSITION_COLORS.length]} />
                ))}
                <Label
                  position="center"
                  content={() => (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fill: CHART.ink }}
                    >
                      <tspan x="50%" dy="-0.4em" style={{ fontSize: 20, fontWeight: 700 }}>
                        {fmtMoneyShort(k?.cout_maintenance_total)}
                      </tspan>
                      <tspan x="50%" dy="1.6em" style={{ fontSize: 12, fill: CHART.muted }}>
                        TND total
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              <Tooltip content={<ChartTooltip valueFmt={(v) => `${fmtInt(v)} TND`} />} />
              <Legend
                iconType="circle"
                formatter={(v) => <span style={{ color: CHART.inkSecondary }}>{v}</span>}
              />
            </PieChart>
          </ChartCard>
        </Col>
      </Row>

      {/* Fleet composition */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <ChartCard
            title="Parc par état"
            subtitle="Répartition opérationnelle du parc"
            loading={isLoading}
            empty={!etat.length}
          >
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={etat}
                dataKey="n"
                nameKey="name"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
                label={(p: { percent?: number }) => `${Math.round((p.percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {etat.map((e) => (
                  <Cell key={e.etat_code} fill={ETAT_CHART_COLORS[e.etat_code]} />
                ))}
                <Label
                  position="center"
                  content={() => (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fill: CHART.ink }}
                    >
                      <tspan x="50%" dy="-0.4em" style={{ fontSize: 20, fontWeight: 700 }}>
                        {fmtInt(k?.vehicules_total)}
                      </tspan>
                      <tspan x="50%" dy="1.6em" style={{ fontSize: 12, fill: CHART.muted }}>
                        véhicules
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              <Tooltip content={<ChartTooltip valueFmt={fmtInt} />} />
              <Legend
                iconType="circle"
                formatter={(v) => <span style={{ color: CHART.inkSecondary }}>{v}</span>}
              />
            </PieChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Parc par genre"
            subtitle="Types de véhicules les plus fréquents"
            loading={isLoading}
            empty={!genre.length}
          >
            <BarChart
              data={genre}
              layout="vertical"
              margin={{ left: 16, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={104}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={CHART.blue}
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Parc par énergie"
            subtitle="Motorisation du parc"
            loading={isLoading}
            empty={!energie.length}
          >
            <BarChart data={energie} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={CHART.aqua}
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      {/* Distribution + maintenance mix */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <ChartCard
            title="Top structures par taille de parc"
            subtitle="Structures détenant le plus de véhicules"
            loading={isLoading}
            empty={!structures.length}
          >
            <BarChart
              data={structures}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={132}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={CHART.blue}
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={9}>
          <ChartCard
            title="Bons de travail par nature"
            subtitle="Réparation · entretien · remorquage"
            loading={isLoading}
            empty={!nature.length}
          >
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={nature}
                dataKey="n"
                nameKey="name"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
                label={(p: { percent?: number }) => `${Math.round((p.percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {nature.map((n) => (
                  <Cell key={n.nature_code} fill={NATURE_CHART_COLORS[n.nature_code]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFmt={fmtInt} />} />
              <Legend
                iconType="circle"
                formatter={(v) => <span style={{ color: CHART.inkSecondary }}>{v}</span>}
              />
            </PieChart>
          </ChartCard>
        </Col>
      </Row>
    </div>
  )
}
