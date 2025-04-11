
// Eliminem location i library, no té efecte ja que depèn del holding
export const REQUIRED_COLUMN_HEADERS = [
  ['MMS ID','Holding ID',"alternative_call_number","alternative_call_number_type","awaiting_reshelving","barcode","base_status","break_indicator","chronology_i","chronology_j","chronology_k","chronology_l","chronology_m","committed_to_retain","creation_date","description","enumeration_a","enumeration_b","enumeration_c","enumeration_d","enumeration_e","enumeration_f","enumeration_g","enumeration_h","fulfillment_note","internal_note_1","internal_note_2","internal_note_3","inventory_number","inventory_price","is_magnetic","linking_number","modification_date","pages","pattern_type","pieces","physical_condition","physical_material_type","policy","po_line","process_type","provenance","public_note","receiving_operator","retention_reason","retention_note","requested","statistics_note_1","statistics_note_2","statistics_note_3","storage_location_id","type_of_unit","year_of_issue"]
];

export const ALLOWED_COLUMN_COUNTS = Array.from({ length: 53 }, (_, i) => i + 2);
