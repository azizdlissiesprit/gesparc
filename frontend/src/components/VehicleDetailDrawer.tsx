import { useQuery } from '@tanstack/react-query'
import { Descriptions, Drawer, Spin, Tabs, Tag, Alert } from 'antd'
import dayjs from 'dayjs'
import { fetchVehicle } from '../api/vehicles'
import type { VehicleDetail } from '../types'
import { etatColor } from '../utils/etat'

interface Props {
  numVeh: string | null
  open: boolean
  onClose: () => void
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function fmtDate(v: unknown): string {
  if (!v) return '—'
  const d = dayjs(v as string)
  return d.isValid() ? d.format('DD/MM/YYYY') : String(v)
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('fr-FR').format(Number(v))
}

export default function VehicleDetailDrawer({ numVeh, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<VehicleDetail>({
    queryKey: ['vehicle', numVeh],
    queryFn: () => fetchVehicle(numVeh as string),
    enabled: open && !!numVeh,
  })

  const v = data ?? ({} as VehicleDetail)

  return (
    <Drawer
      title={
        <span>
          Véhicule {fmt(v.num_plaque)}{' '}
          {v.etat_code != null && (
            <Tag color={etatColor(v.etat_code)}>{v.etat}</Tag>
          )}
        </span>
      }
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Impossible de charger le véhicule." />
      ) : (
        <>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="N° plaque">{fmt(v.num_plaque)}</Descriptions.Item>
            <Descriptions.Item label="Marque">{fmt(v.marque_lib)}</Descriptions.Item>
            <Descriptions.Item label="Genre">{fmt(v.genre_lib)}</Descriptions.Item>
            <Descriptions.Item label="Type">{fmt(v.type_lib)}</Descriptions.Item>
          </Descriptions>

          <Tabs
            defaultActiveKey="affectation"
            items={[
              {
                key: 'affectation',
                label: 'Affectation',
                children: (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="État">
                      {v.etat_code != null ? (
                        <Tag color={etatColor(v.etat_code)}>{v.etat}</Tag>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Structure">
                      {fmt(v.structure_lib)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bénéficiaire">
                      {fmt(v.beneficiaire)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nature affectation">
                      {fmt(v.nat_affect)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date affectation">
                      {fmtDate(v.date_affect)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Réf. affectation">
                      {fmt(v.ref_affect)}
                    </Descriptions.Item>
                    <Descriptions.Item label="N° châssis">
                      {fmt(v.num_veh)}
                    </Descriptions.Item>
                    <Descriptions.Item label="N° propriétaire d'état">
                      {fmt(v.num_pe)}
                    </Descriptions.Item>
                    <Descriptions.Item label="N° carte d'utilisation">
                      {fmt(v.num_cu)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Index KM (actuel)">
                      {fmtNum(v.index_km_actuel ?? v.index_km)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'carte_grise',
                label: 'Carte grise',
                children: (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="N° carte grise">
                      {fmt(v.num_cg)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Référence du type">
                      {fmt(v.ref_type)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Énergie">
                      {fmt(v.energie_lib)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nombre de places">
                      {fmt(v.nbr_places)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Carrosserie">
                      {fmt(v.carrosserie)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Consommation moy. (L/100km)">
                      {fmt(v.cons_moy_cent_km)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Charge utile">
                      {fmt(v.charge_utile)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Puissance fiscale">
                      {fmt(v.pf)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Puissance moteur">
                      {fmt(v.pm)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nombre d'essieux">
                      {fmt(v.nbre_essieux)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cylindrée">
                      {fmt(v.cylindree)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Dim. pneus AV / AR">
                      {fmt(v.dimension_pneu_av)} / {fmt(v.dimension_pneu_ar)}
                    </Descriptions.Item>
                    <Descriptions.Item label="1re mise en circulation">
                      {fmtDate(v.date_prem_mise_circul)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Âge (ans)">
                      {fmt(v.age_veh)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'exploitation',
                label: 'Exploitation',
                children: (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Usage">
                      {fmt(v.usage_lib)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assurance">
                      {fmt(v.assurance)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fournisseur (n°)">
                      {fmt(v.num_fourn)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Référence BC">
                      {fmt(v.ref_bc)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date réception">
                      {fmtDate(v.date_reception)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Prix achat">
                      {fmtNum(v.prix_unitaire)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Situation douanière">
                      {fmt(v.situation_douane)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Code leasing">
                      {fmt(v.code_leasing)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date échéance">
                      {fmtDate(v.date_echeance)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  )
}
