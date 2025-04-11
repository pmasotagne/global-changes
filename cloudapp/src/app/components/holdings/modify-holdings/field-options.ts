export const REQUIRED_COLUMN_HEADERS = [
    ['MMS ID', 'Holding ID', 'Field', 'Subfield', 'original', 'new']
  ];
  
export const ALLOWED_COLUMN_COUNTS = [6];

export interface FieldOption {
    value: string;
    label: string;
}  

export const fieldOptions: FieldOption[] = [
    { value: 'library', label: 'field.library' },
    { value: 'barcode', label: 'field.barcode' },
    { value: 'committed_to_retain', label: 'field.committed_to_retain' },
    { value: 'physical_condition', label: 'field.physical_condition' },
    { value: 'chronology_i', label: 'field.chronology_i' },
    { value: 'chronology_j', label: 'field.chronology_j' },
    { value: 'chronology_k', label: 'field.chronology_k' },
    { value: 'chronology_l', label: 'field.chronology_l' },
    { value: 'chronology_m', label: 'field.chronology_m' },
    { value: 'year_of_issue', label: 'field.year_of_issue' },
    { value: 'description', label: 'field.description' },
    { value: 'enumeration_a', label: 'field.enumeration_a' },
    { value: 'enumeration_b', label: 'field.enumeration_b' },
    { value: 'enumeration_c', label: 'field.enumeration_c' },
    { value: 'enumeration_d', label: 'field.enumeration_d' },
    { value: 'enumeration_e', label: 'field.enumeration_e' },
    { value: 'enumeration_f', label: 'field.enumeration_f' },
    { value: 'enumeration_g', label: 'field.enumeration_g' },
    { value: 'enumeration_h', label: 'field.enumeration_h' },
    { value: 'is_magnetic', label: 'field.is_magnetic' },
    { value: 'storage_location_id', label: 'field.storage_location_id' },
    { value: 'break_indicator', label: 'field.break_indicator' },
    { value: 'location', label: 'field.location' },
    { value: 'retention_note', label: 'field.retention_note' },
    { value: 'fulfillment_note', label: 'field.fulfillment_note' },
    { value: 'statistics_note_1', label: 'field.statistics_note_1' },
    { value: 'statistics_note_2', label: 'field.statistics_note_2' },
    { value: 'statistics_note_3', label: 'field.statistics_note_3' },
    { value: 'internal_note_1', label: 'field.internal_note_1' },
    { value: 'internal_note_2', label: 'field.internal_note_2' },
    { value: 'internal_note_3', label: 'field.internal_note_3' },
    { value: 'public_note', label: 'field.public_note' },
    { value: 'linking_number', label: 'field.linking_number' },
    { value: 'inventory_number', label: 'field.inventory_number' },
    { value: 'receiving_operator', label: 'field.receiving_operator' },
    { value: 'pages', label: 'field.pages' },
    { value: 'pieces', label: 'field.pieces' },
    { value: 'policy', label: 'field.policy' },
    { value: 'inventory_price', label: 'field.inventory_price' },
    { value: 'provenance', label: 'field.provenance' },
    { value: 'retention_reason', label: 'field.retention_reason' },
    { value: 'alternative_call_number', label: 'field.alternative_call_number' },
    { value: 'type_of_unit', label: 'field.type_of_unit' },
    { value: 'physical_material_type', label: 'field.physical_material_type' },
    { value: 'pattern_type', label: 'field.pattern_type' },
    { value: 'process_type', label: 'field.process_type' },
    { value: 'alternative_call_number_type', label: 'field.alternative_call_number_type' },
  ];