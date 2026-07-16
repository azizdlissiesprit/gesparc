// Shared API types for the GesParc dashboard.

export interface Paginated<T> {
  count: number
  page: number
  page_size: number
  results: T[]
}

/** One row of the vehicles list (from V_GESPARC_VEHICULE + label joins). */
export interface VehicleListItem {
  num_veh: string
  num_plaque: string
  marque_code: number | null
  marque: string | null
  type_code: string | null
  ref_type: string | null
  type: string | null
  genre_code: string | null
  genre: string | null
  energie_code: number | null
  energie: string | null
  num_struct: string | null
  structure: string | null
  iu: string | null
  beneficiaire: string | null
  etat_code: number | null
  etat: string | null
  index_km: number | null
  age_veh: number | null
}

/** Full vehicle record for the detail/edit view (raw columns + resolved labels). */
export interface VehicleDetail extends Record<string, unknown> {
  num_veh: string
  num_plaque: string
  marque_lib?: string | null
  genre_lib?: string | null
  type_lib?: string | null
  energie_lib?: string | null
  structure_lib?: string | null
  usage_lib?: string | null
  etat?: string | null
  etat_code?: number | null
  beneficiaire?: string | null
  index_km_actuel?: number | null
  age_veh?: number | null
}

export interface LookupItem {
  value: string | number
  label: string
  marque?: number
}

export interface VehicleStats {
  total: number
  by_etat: { etat_code: number; etat: string; n: number }[]
  by_energie: { energie: string | null; n: number }[]
  by_marque: { marque: string | null; n: number }[]
}

export interface VehicleQuery {
  search?: string
  num_struct?: string
  etat?: number
  page?: number
  page_size?: number
}

export type ValidityStatut = 'valide' | 'bientot' | 'expiree' | 'inconnu'

export interface VisiteTechnique {
  id: string
  num_plaque: string | null
  num_veh: string
  num_struct: string | null
  structure: string | null
  montant: number | null
  date_debut: string | null
  date_fin: string | null
  quittance: string | null
  statut: ValidityStatut
}

export interface VisiteQuery {
  search?: string
  num_struct?: string
  statut?: ValidityStatut
  page?: number
  page_size?: number
}

export interface VisiteStats {
  total: number
  expirees: number
  bientot: number
  valides: number
  montant_total: number | null
}

export type ReformeStatut = 'vendu' | 'non_vendu'

export interface ReformeLigne {
  id: string
  num_plaque: string | null
  reference: string | null
  date_reforme: string | null
  date_vente: string | null
  prix_vente: number | null
  cause: string | null
  num_struct: string | null
  structure: string | null
  statut: ReformeStatut
}

export interface ReformeQuery {
  search?: string
  num_struct?: string
  statut?: ReformeStatut
  page?: number
  page_size?: number
}

export interface ReformeStats {
  total: number
  vendus: number
  non_vendus: number
  nb_references: number
  montant_total: number | null
}

export interface BonTravail {
  reference: string
  num_veh: string | null
  num_plaque: string | null
  num_struct: string | null
  structure: string | null
  num_parc: string | null
  nature_code: string | null
  nature: string | null
  mode_code: string | null
  mode: string | null
  date_entree: string | null
  date_sortie_prev: string | null
  date_sortie: string | null
  etat_code: string | null
  etat: string | null
  num_fourn: string | null
  cout: number | null
}

export interface BonTravailQuery {
  search?: string
  num_struct?: string
  nature?: string
  mode?: string
  etat?: string
  page?: number
  page_size?: number
}

export interface BonTravailOperation {
  code: number
  designation: string | null
  quantite: number | null
  prix_unitaire: number | null
  nbr_personne: number | null
}

export interface BonTravailDetail extends BonTravail {
  index_km: string | null
  observation: string | null
  marque: string | null
  type: string | null
  montant_piece: number | null
  montant_main_oeuvre: number | null
  montant_rep_externe: number | null
  cout_total: number | null
  num_bc: string | null
  date_bc: string | null
  montant_commande: string | null
  num_facture: string | null
  date_facture: string | null
  montant_reglement: string | null
  num_reglement: string | null
  date_reglement: string | null
  operations: BonTravailOperation[]
}

export interface Demande {
  id: string
  reference: string
  date_demande: string | null
  num_plaque: string | null
  num_veh: string
  num_struct: string | null
  structure: string | null
  demandeur: string | null
  statut_code: string | null
  statut: string | null
  date_rdv: string | null
  description: string | null
  index_km: string | null
}

export interface DemandeQuery {
  search?: string
  num_struct?: string
  statut?: string
  page?: number
  page_size?: number
}

export interface DemandeStats {
  total: number
  finis: number
  en_attente: number
  refuses: number
  vehicules: number
}

export interface BonTravailStats {
  total: number
  internes: number
  externes: number
  cout_total: number | null
  by_nature: { nature_code: string; nature: string; n: number }[]
}

export interface BonCommande {
  reference: string
  date_creation: string | null
  num_fourn: string | null
  fournisseur: string | null
  num_parc: string | null
  parc: string | null
  num_marche: string | null
  montant: number | null
  date_livraison: string | null
  montant_livre: number | null
  montant_facture: number | null
  date_facture: string | null
  montant_reglement: number | null
  date_reglement: string | null
  statut_code: string | null
  statut: string | null
}

export interface BonCommandeLigne {
  code: string | null
  designation: string | null
  quantite: number | null
  prix_unitaire: number | null
  tva: number | null
  montant_ht: number | null
  montant_ttc: number | null
}

export interface BonCommandeDetail extends BonCommande {
  lignes: BonCommandeLigne[]
}

export interface BonCommandeQuery {
  search?: string
  num_fourn?: string
  statut?: string
  page?: number
  page_size?: number
}

export interface BonCommandeStats {
  total: number
  receptionnes: number
  en_attente: number
  nb_fournisseurs: number
  montant_total: number | null
}

export interface Article {
  code: string
  designation: string | null
  ref_constructeur: string | null
  genre: string | null
  marque_code: number | null
  marque: string | null
  type: string | null
  prix: number | null
  qte_stock: number | null
}

export interface ArticleDetail extends Article {
  ref_remplacement: string | null
  tva: number | null
  quantite_min: number | null
  num_famille: number | null
  famille: string | null
  num_s_famille: number | null
  sous_famille: string | null
}

export interface ArticleQuery {
  search?: string
  marque?: number
  statut?: string
  page?: number
  page_size?: number
}

export interface ArticleStats {
  total: number
  en_stock: number
  rupture: number
  valeur_stock: number | null
  nb_marques: number
}

export interface OrdreMission {
  num_om: number
  num_plaque: string | null
  num_veh: string | null
  num_struct: string | null
  structure: string | null
  iu: string | null
  conducteur: string | null
  destination: string | null
  date_om: string | null
  date_depart: string | null
  date_fin: string | null
  date_debut_validite: string | null
  date_fin_validite: string | null
  km_depart: number | null
  km_retour: number | null
  statut_code: string | null
  statut: string | null
}

export interface OrdreMissionDetail extends OrdreMission {
  objectif: string | null
  produits_transp: string | null
  lieu_depart: string | null
  distance: number | null
}

export interface OrdreMissionQuery {
  search?: string
  num_struct?: string
  statut?: string
  page?: number
  page_size?: number
}

export interface OrdreMissionStats {
  total: number
  en_cours: number
  terminees: number
  vehicules: number
  conducteurs: number
}

export interface Fournisseur {
  code: string
  designation: string | null
  activite: string | null
  adresse: string | null
  tel: string | null
  email: string | null
  bloque: number | null
  statut: string | null
}

export interface FournisseurDetail extends Fournisseur {
  raison_sociale: string | null
  fax: string | null
  web: string | null
  bank: string | null
  rib: string | null
  mat_fisc: string | null
  date_creation: string | null
}

export interface FournisseurQuery {
  search?: string
  statut?: string
  page?: number
  page_size?: number
}

export interface FournisseurStats {
  total: number
  actifs: number
  bloques: number
  avec_tel: number
}

export interface Sinistre {
  num_sin: string
  num_plaque: string | null
  num_veh: string | null
  num_struct: string | null
  structure: string | null
  cause_code: number | null
  cause: string | null
  nature_code: number | null
  nature: string | null
  date_sinistre: string | null
  lieu_sinistre: string | null
  tiers: string | null
  montant_rep: number | null
  montant_indem: number | null
  date_fin: string | null
  statut_code: string | null
  statut: string | null
}

export interface SinistreDetail extends Sinistre {
  observation: string | null
  adresse_tiers: string | null
  assurance_tiers: string | null
  expert_code: string | null
  expert: string | null
  date_expertise: string | null
  date_reexpertise: string | null
  date_notif: string | null
}

export interface SinistreQuery {
  search?: string
  nature?: number
  statut?: string
  page?: number
  page_size?: number
}

export interface SinistreStats {
  total: number
  ouverts: number
  clos: number
  montant_rep_total: number | null
  montant_indem_total: number | null
}

export interface OverviewData {
  kpis: {
    vehicules_total: number
    en_circulation: number
    bons_travail_total: number
    cout_maintenance_total: number
    reformes_total: number
    reformes_vendus: number
    visites_total: number
    visites_expirees: number
  }
  parc_par_etat: { etat_code: number; etat: string; n: number }[]
  parc_par_energie: { energie: string | null; n: number }[]
  top_marques: { marque: string | null; n: number }[]
  bt_par_nature: { nature_code: string; nature: string; n: number }[]
  cout_maintenance_par_annee: { annee: string; cout: number; nombre: number }[]
}
