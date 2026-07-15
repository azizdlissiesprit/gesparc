import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton, Empty, Typography } from 'antd'
import {
  CarOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

const { Title } = Typography

const axisTick = { fill: CHART.muted, fontSize: 12 }

function ChartCard({
  title,
  loading,
  empty,
  children,
}: {
  title: string
  loading: boolean
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <Card title={title} styles={{ body: { padding: 16, height: 320 } }}>
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
  const marques = (data?.top_marques ?? []).map((m) => ({
    name: cleanLabel(m.marque),
    n: m.n,
  }))
  const energie = (data?.parc_par_energie ?? []).map((e) => ({
    name: cleanLabel(e.energie),
    n: e.n,
  }))
  const cout = data?.cout_maintenance_par_annee ?? []

  const kpis = [
    {
      title: 'Total véhicules',
      value: fmtInt(k?.vehicules_total),
      icon: <CarOutlined />,
      color: undefined as string | undefined,
    },
    {
      title: 'En circulation',
      value: fmtInt(k?.en_circulation),
      icon: <CheckCircleOutlined />,
      color: '#3f8600',
    },
    {
      title: 'Bons de travail',
      value: fmtInt(k?.bons_travail_total),
      icon: <ToolOutlined />,
      color: undefined,
    },
    {
      title: 'Coût maintenance (TND)',
      value: fmtMoneyShort(k?.cout_maintenance_total),
      icon: <WalletOutlined />,
      color: '#096dd9',
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Tableau de bord
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {kpis.map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.title}>
            <Card>
              {isLoading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic
                  title={c.title}
                  value={c.value}
                  prefix={c.icon}
                  valueStyle={c.color ? { color: c.color } : undefined}
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Parc par état" loading={isLoading} empty={!etat.length}>
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={etat}
                dataKey="n"
                nameKey="name"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
                label={(p: { percent?: number }) =>
                  `${Math.round((p.percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {etat.map((e) => (
                  <Cell key={e.etat_code} fill={ETAT_CHART_COLORS[e.etat_code]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFmt={fmtInt} />} />
              <Legend
                iconType="circle"
                formatter={(v) => (
                  <span style={{ color: CHART.inkSecondary }}>{v}</span>
                )}
              />
            </PieChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            title="Bons de travail par nature"
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
                label={(p: { percent?: number }) =>
                  `${Math.round((p.percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {nature.map((n) => (
                  <Cell key={n.nature_code} fill={NATURE_CHART_COLORS[n.nature_code]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFmt={fmtInt} />} />
              <Legend
                iconType="circle"
                formatter={(v) => (
                  <span style={{ color: CHART.inkSecondary }}>{v}</span>
                )}
              />
            </PieChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Top 10 marques"
            loading={isLoading}
            empty={!marques.length}
          >
            <BarChart
              data={marques}
              layout="vertical"
              margin={{ left: 24, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={90}
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
              />
            </BarChart>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard
            title="Parc par énergie"
            loading={isLoading}
            empty={!energie.length}
          >
            <BarChart data={energie} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                content={<ChartTooltip valueFmt={fmtInt} />}
              />
              <Bar
                isAnimationActive={false}
                dataKey="n"
                name="Véhicules"
                fill={CHART.blue}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard
            title="Coût de maintenance par année (TND)"
            loading={isLoading}
            empty={!cout.length}
          >
            <LineChart data={cout} margin={{ left: 8, right: 24, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="annee" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtMoneyShort(v)}
                width={52}
              />
              <Tooltip content={<ChartTooltip valueFmt={(v) => `${fmtInt(v)} TND`} />} />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="cout"
                name="Coût"
                stroke={CHART.blue}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.blue, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartCard>
        </Col>
      </Row>
    </div>
  )
}
