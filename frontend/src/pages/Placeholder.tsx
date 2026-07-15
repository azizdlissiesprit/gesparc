import { useLocation } from 'react-router-dom'
import { Empty, Card } from 'antd'

export default function Placeholder() {
  const { pathname } = useLocation()
  const name = pathname.replace('/', '') || 'module'
  return (
    <Card>
      <Empty
        description={
          <span>
            Le module <b>{name}</b> sera bientôt disponible.
            <br />
            Le module <b>Gestion des véhicules</b> est actif.
          </span>
        }
      />
    </Card>
  )
}
