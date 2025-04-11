export const REQUIRED_COLUMN_HEADERS = [
    ['PO ID', 'original', 'new']
  ];
  
export const ALLOWED_COLUMN_COUNTS = [3];

export interface FieldOption {
    value: string;
    label: string;
}  

export const fieldOptions: FieldOption[] = [
    { value: 'owner', label: 'field.owner' },
    { value: 'acquisition_method', label: 'field.acquisition_method' },
    { value: 'material_type', label: 'field.material_type' },
    { value: 'receiving_note', label: 'field.receiving_note' },
    { value: 'reporting_code', label: 'field.reporting_code' },
    { value: 'secondary_reporting_code', label: 'field.secondary_reporting_code' },
    { value: 'tertiary_reporting_code', label: 'field.tertiary_reporting_code' },
    { value: 'fourth_reporting_code', label: 'field.fourth_reporting_code' },
    { value: 'fifth_reporting_code', label: 'field.fifth_reporting_code' },
    { value: 'vendor_note', label: 'field.vendor_note' }
  ];