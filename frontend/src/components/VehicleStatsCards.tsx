import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import { CarOutlined } from '@ant-design/icons'
import { fetchVehicleStats } from '../api/vehicles'
import { ETAT_META } from '../utils/etat'

const HIGHLIGHT_ETATS = [1, 2, 5, 6] // circulation, réparation, réformé, vendu

export default function VehicleStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-stats'],
    queryFn: fetchVehicleStats,
  })

  const countFor = (code: number) =>
    data?.by_etat.find((e) => e.etat_code === code)?.n ?? 0

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <Card>
          {isLoading ? (
            <Skeleton active paragraph={false} />
          ) : (
            <Statistic
              title="Total véhicules"
              value={data?.total ?? 0}
              prefix={<CarOutlined />}
            />
          )}
        </Card>
      </Col>
      {HIGHLIGHT_ETATS.map((code) => (
        <Col xs={24} sm={12} md={8} lg={5} xl={5} key={code}>
          <Card>
            {isLoading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Statistic
                title={ETAT_META[code].label}
                value={countFor(code)}
                valueStyle={{
                  color:
                    ETAT_META[code].color === 'default'
                      ? undefined
                      : ETAT_META[code].color,
                }}
              />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  )
}
