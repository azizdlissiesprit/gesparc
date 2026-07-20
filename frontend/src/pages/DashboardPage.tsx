import { useQuery } from '@tanstack/react-query'
import { Col, Row, Typography } from 'antd'
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
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchOverview } from '../api/overview'
import ChartTooltip from '../charts/ChartTooltip'
import ChartCard from '../components/ChartCard'
import type { TableView } from '../components/ChartCard'
import StatsRow from '../components/StatTile'
import {
  CHART,
  cleanLabel,
  fmtInt,
  fmtMoneyShort,
} from '../charts/theme'

const { Title, Text } = Typography

const axisTick = { fill: CHART.muted, fontSize: 12 }
// Validated 3-slot categorical set (see dataviz validator: all checks pass).
const COMPOSITION_COLORS = [CHART.blue, CHART.aqua, CHART.yellow]
// Magnitude is one hue: every single-series bar uses the sequential default.
const BAR = CHART.blue

// Shorten the long official structure names for chart axes.
const shortStruct = (s: string | null | undefined) => {
  const short = cleanLabel(s)
    .replace(/^[ًٌٍَُِّْ]+/, '')
    .replace(/^Direction Régionale de\s+/i, 'DR ')
    .replace(/^Direction Régionale d['’]/i, 'DR ')
    .replace(/^Direction Centrale\s+/i, 'DC ')
    .replace(/^Direction Exécutive\s+/i, 'DE ')
    .replace(/^Division\s+/i, 'Div. ')
    .replace(/^Direction\s+/i, 'Dir. ')
  return short.length > 20 ? `${short.slice(0, 19)}…` : short
}

/** Build the accessible table twin for a simple label/value chart. */
const tableOf = (
  dimension: string,
  measure: string,
  rows: { name: string; n: number }[],
  fmt: (n: number) => string = fmtInt,
): TableView => ({
  dimension,
  measure,
  rows: rows.map((r, i) => ({ key: `${r.name}-${i}`, label: r.name, value: fmt(r.n) })),
})

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    staleTime: 60_000,
  })

  const k = data?.kpis
  const etat = (data?.parc_par_etat ?? []).map((e) => ({ name: e.etat, n: e.n }))
  const nature = (data?.bt_par_nature ?? []).map((n) => ({ name: n.nature, n: n.n }))
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
      label: 'Parc total',
      value: fmtInt(k?.vehicules_total),
      hint: 'véhicules immatriculés',
    },
    {
      icon: <CheckCircleOutlined />,
      accent: '#008300',
      label: 'En circulation',
      value: fmtInt(k?.en_circulation),
      hint: `${k?.disponibilite ?? 0} % du parc`,
    },
    {
      icon: <FieldTimeOutlined />,
      accent: '#4a3aa7',
      label: 'Âge moyen du parc',
      value: k?.age_moyen != null ? `${k.age_moyen} ans` : '—',
      hint: 'signal de renouvellement',
    },
    {
      icon: <WalletOutlined />,
      accent: '#096dd9',
      label: 'Coût de maintenance',
      value: `${fmtMoneyShort(k?.cout_maintenance_total)} TND`,
      hint: 'cumulé, tous bons de travail',
    },
    {
      icon: <DollarOutlined />,
      accent: '#d46b08',
      label: 'Coût moyen / véhicule',
      value: `${fmtInt(k?.cout_moyen_vehicule)} TND`,
      hint: 'maintenance par véhicule',
    },
    {
      icon: <ToolOutlined />,
      accent: '#1baf7a',
      label: 'Bons de travail',
      value: fmtInt(k?.bons_travail_total),
      hint: 'interventions enregistrées',
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 2 }}>
        Tableau de bord
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Vue d'ensemble du parc, de la maintenance et des coûts — Tunisie Telecom
      </Text>

      <StatsRow items={kpis} loading={isLoading} />

      {/* Two measures, two charts — never two y-scales on one plot. */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Coût de maintenance par année"
            subtitle="Dépense de réparation en TND — années complètes"
            loading={isLoading}
            empty={!cout.length}
            table={tableOf(
              'Année',
              'Coût (TND)',
              cout.map((c) => ({ name: c.annee, n: c.cout })),
            )}
          >
            <BarChart data={cout} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtMoneyShort(v)}
                width={52}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={(v) => `${fmtInt(v)} TND`} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="cout"
                name="Coût"
                fill={BAR}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            title="Interventions par année"
            subtitle="Nombre de bons de travail ouverts"
            loading={isLoading}
            empty={!cout.length}
            table={tableOf(
              'Année',
              'Interventions',
              cout.map((c) => ({ name: c.annee, n: c.nombre })),
            )}
          >
            <LineChart data={cout} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip valueFmt={fmtInt} />} />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="nombre"
                name="Interventions"
                stroke={BAR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: BAR, stroke: CHART.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <ChartCard
            title="Répartition du coût de maintenance"
            subtitle="Où va la dépense — part de chaque poste"
            loading={isLoading}
            empty={!composition.length}
            table={tableOf(
              'Poste',
              'Coût (TND)',
              composition.map((c) => ({ name: c.name, n: c.value })),
            )}
          >
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={composition}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
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
                      <tspan x="50%" dy="-0.4em" style={{ fontSize: 19, fontWeight: 650 }}>
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

        <Col xs={24} lg={8}>
          <ChartCard
            title="Parc par état"
            subtitle="Répartition opérationnelle du parc"
            loading={isLoading}
            empty={!etat.length}
            table={tableOf('État', 'Véhicules', etat)}
          >
            <BarChart
              data={etat}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={BAR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
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
            table={tableOf('Énergie', 'Véhicules', energie)}
          >
            <BarChart data={energie} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={BAR}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ChartCard
            title="Parc par genre"
            subtitle="Types de véhicules les plus fréquents"
            loading={isLoading}
            empty={!genre.length}
            table={tableOf('Genre', 'Véhicules', genre)}
          >
            <BarChart
              data={genre}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
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
                fill={BAR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Top structures par taille de parc"
            subtitle="Structures détenant le plus de véhicules"
            loading={isLoading}
            empty={!structures.length}
            table={tableOf('Structure', 'Véhicules', structures)}
          >
            <BarChart
              data={structures}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={124}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={BAR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Bons de travail par nature"
            subtitle="Répartition des interventions"
            loading={isLoading}
            empty={!nature.length}
            table={tableOf('Nature', 'Bons de travail', nature)}
          >
            <BarChart
              data={nature}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Bons de travail"
                fill={BAR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>
    </div>
  )
}
