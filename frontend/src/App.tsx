import { useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Typography, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  CarOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import DashboardPage from './pages/DashboardPage'
import VehiclesPage from './pages/VehiclesPage'
import VisitesTechniquesPage from './pages/VisitesTechniquesPage'
import ReformesPage from './pages/ReformesPage'
import BonsTravailPage from './pages/BonsTravailPage'
import DemandesInterventionPage from './pages/DemandesInterventionPage'
import SortiesVehiculesPage from './pages/SortiesVehiculesPage'
import HistoriqueMaintenancePage from './pages/HistoriqueMaintenancePage'
import BonsCommandePage from './pages/BonsCommandePage'
import StockArticlesPage from './pages/StockArticlesPage'
import OrdresMissionPage from './pages/OrdresMissionPage'
import FournisseursPage from './pages/FournisseursPage'
import SinistresPage from './pages/SinistresPage'
import ExploitationPage from './pages/ExploitationPage'
import Placeholder from './pages/Placeholder'

const { Header, Sider, Content } = Layout
const { Title } = Typography

// Navigation mirrors the legacy GesParc left menu. Only the Vehicles module
// is wired to a real screen for now; the rest are placeholders.
const menuItems: MenuProps['items'] = [
  { key: '/', icon: <HomeOutlined />, label: 'Tableau de bord' },
  {
    key: 'administratif',
    icon: <CarOutlined />,
    label: 'Administratif',
    children: [
      { key: '/vehicules', label: 'Gestion des véhicules' },
      { key: '/taxes', label: 'Taxes de circulation' },
      { key: '/assurances', label: 'Gestion des assurances' },
      { key: '/visites', label: 'Visites techniques' },
      { key: '/reformes', label: 'Gestion des réformes' },
    ],
  },
  { key: '/exploitation', icon: <DashboardOutlined />, label: 'Exploitation' },
  { key: '/missions', icon: <FileTextOutlined />, label: 'Ordres de mission' },
  { key: '/carburant', icon: <DollarOutlined />, label: 'Carburant' },
  { key: '/achat', icon: <ShoppingCartOutlined />, label: 'Achat' },
  { key: '/stock', icon: <DatabaseOutlined />, label: 'Stock' },
  {
    key: 'maintenance',
    icon: <ToolOutlined />,
    label: 'Maintenance & réparation',
    children: [
      { key: '/interventions', label: "Demandes d'intervention" },
      { key: '/bons-travail', label: 'Bons de travail' },
      { key: '/sorties', label: 'Sorties des véhicules' },
      { key: '/historique', label: 'Historique maintenance' },
    ],
  },
  { key: '/referentiel', icon: <SettingOutlined />, label: 'Référentiel' },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={248}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 700,
            color: '#1677ff',
            fontSize: collapsed ? 14 : 18,
          }}
        >
          <CarOutlined />
          {!collapsed && <span>GesParc</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['administratif', 'maintenance']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Gestion de Parc — Tableau de bord
          </Title>
          <span style={{ color: '#8c8c8c' }}>Tunisie Telecom</span>
        </Header>
        <Content style={{ margin: 0, padding: 24 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vehicules" element={<VehiclesPage />} />
            <Route path="/visites" element={<VisitesTechniquesPage />} />
            <Route path="/reformes" element={<ReformesPage />} />
            <Route path="/bons-travail" element={<BonsTravailPage />} />
            <Route path="/interventions" element={<DemandesInterventionPage />} />
            <Route path="/sorties" element={<SortiesVehiculesPage />} />
            <Route path="/historique" element={<HistoriqueMaintenancePage />} />
            <Route path="/achat" element={<BonsCommandePage />} />
            <Route path="/stock" element={<StockArticlesPage />} />
            <Route path="/missions" element={<OrdresMissionPage />} />
            <Route path="/referentiel" element={<FournisseursPage />} />
            <Route path="/assurances" element={<SinistresPage />} />
            <Route path="/exploitation" element={<ExploitationPage />} />
            <Route path="*" element={<Placeholder />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
