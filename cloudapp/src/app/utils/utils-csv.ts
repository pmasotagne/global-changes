import { TranslateService } from '@ngx-translate/core';

export interface FileValidationResult {
    isValid: boolean;
    errorMessage?: string;
    rowCount?: number;
}

export function parseCSV(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
  
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
  
        if (char === '"' && inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell);
                rows.push(currentRow);
            }
            currentCell = '';
            currentRow = [];
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
        } else {
            currentCell += char;
        }
    }
  
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
  
    return rows;
}

export function validateColumns(columns: string[], requiredColumns: string[]): boolean {
    return JSON.stringify(columns) === JSON.stringify(requiredColumns);
}

export async function validateFile(
    file: File,
    allowedColumnCounts: number[],
    translate: TranslateService,
    fileType: 'item' | 'optional' | 'holding' | 'user' | 'polines'
  ): Promise<FileValidationResult> {
    return new Promise((resolve) => {
      const validFileTypes = ['text/csv'];
      const maxFileSize = 2 * 1024 * 1024; // 2MB in bytes
  
      // Check file size
      if (file.size > maxFileSize) {
        resolve({
          isValid: false,
          errorMessage: translate.instant('validateFile.error.fileTooLarge', {
            maxSize: '2MB',
          }),
        });
        return;
      }
      
      // Check file type
      if (!validFileTypes.includes(file.type)) {
        resolve({
          isValid: false,
          errorMessage: translate.instant('validateFile.error.invalidFileType'),
        });
        return;
      }
  
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result as string;
          const rows = parseCSV(content);
  
          if (rows.length === 0) {
            throw new Error(translate.instant('validateFile.error.emptyFile'));
          }
  
          // Get headers; optionally trim for some types
          let headers = rows[0];
          if (fileType === 'optional') {
            headers = headers.map((h: string) => h.trim());
          }
  
          const headerColumnCount = headers.length;
          const minColumns = Math.min(...allowedColumnCounts);
          const maxColumns = Math.max(...allowedColumnCounts);
  
          // Ensure the header column count is within the allowed range
          if (headerColumnCount < minColumns || headerColumnCount > maxColumns) {
            throw new Error(
              translate.instant('validateFile.error.invalidHeaderColumnCount', {
                expected: allowedColumnCounts.join(' or '),
                actual: headerColumnCount,
              })
            );
          }
  
          // Validate headers based on file type
          switch (fileType) {
            case 'item':
              if (headerColumnCount === minColumns) {
                if (headers[0] !== 'Barcode') {
                  throw new Error(
                    translate.instant('validateFile.error.invalidHeaderBarcode')
                  );
                }
                else {                    
                    if (headerColumnCount === 3 && (headers[1] !== 'original' || headers[2] !== 'new')) {
                        throw new Error(
                            translate.instant('validateFile.error.invalidHeaders')
                        );
                    }
                    else if (headerColumnCount === 2 && headers[1] !== 'delimiter') {
                        console.log(headerColumnCount);
                        console.log(headers[1]);    
                        throw new Error(
                            translate.instant('validateFile.error.invalidHeaders')
                        );
                    }
                    
                }
              } else if (headerColumnCount === maxColumns) {
                if (headers[0] !== 'MMS ID' || headers[1] !== 'Holding ID' || headers[2] !== 'Physical ID') {
                  throw new Error(
                    translate.instant('validateFile.error.invalidHeaderMMS')
                  );
                }
                else {
                    if (headerColumnCount === 5 && (headers[3] !== 'original' || headers[4] !== 'new')) {
                        throw new Error(
                            translate.instant('validateFile.error.invalidHeaders')
                        );
                    }
                    else if (headerColumnCount === 4 && headers[3] !== 'delimiter') {
                        throw new Error(
                            translate.instant('validateFile.error.invalidHeaders')
                        );
                    }
                }
              } else {
                throw new Error(
                    translate.instant('validateFile.error.invalidHeaderColumnCount', {
                        expected: allowedColumnCounts.join(' or '),
                        actual: headerColumnCount
                    })
                );
              }
              break;
  
            case 'optional':
              if (!headers.includes('MMS ID')) {
                throw new Error(translate.instant('validateFile.error.missingMMSID'));
              }
              if (!headers.includes('Holding ID')) {
                throw new Error(
                  translate.instant('validateFile.error.missingHoldingID')
                );
              }
              // Optionally: validate each header against a set of valid headers if available.
              break;
  
            case 'holding':
              if (headerColumnCount === maxColumns) {
                if (headers[0] !== 'MMS ID' || headers[1] !== 'Holding ID') {
                  throw new Error(
                    translate.instant('validateFile.error.invalidHeaderHolding')
                  );
                } else {
                    if (headerColumnCount === 6 && (headers[2] !== 'Field' || headers[3] !== 'Subfield' || headers[4] !== 'original' || headers[5] !== 'new')){
                        throw new Error(
                            translate.instant('validateFile.error.invalidHeaders')
                        );
                    }
                }
              }
              break;
  
            case 'user':
              if (headerColumnCount === maxColumns) {
                if (headers[0] !== 'primary_id') {
                  throw new Error(
                    translate.instant('validateFile.error.invalidHeaderHolding')
                  );
                }
              }
              break;
  
            case 'polines':
              if (headerColumnCount === maxColumns) {
                if (headers[0] !== 'PO ID') {
                  throw new Error(
                    translate.instant('validateFile.error.invalidHeaderPOLines')
                  );
                }
              }
              break;
  
            default:
              break;
          }
  
          // Check for duplicate keys if applicable (for some file types)
          const seenKeys = new Set<string>();
          // Use the first column for 3-column files, or third column for 5-column files
          let keyIndex = -1;
          if (fileType === 'item' || fileType === 'optional') {
            //keyIndex = headerColumnCount === 3 ? 0 : headerColumnCount === 5 ? 2 : -1;
            const lowerHeaders = headers.map((h: string) => h.trim().toLowerCase());

            // Option 1: Prefer to use "barcode" if present
            if (lowerHeaders.includes('barcode')) {
              keyIndex = lowerHeaders.indexOf('barcode');
            } 
            // Option 2: Otherwise, if a "physical id" header is present then use that
            else if (lowerHeaders.includes('physical id')) {
              keyIndex = lowerHeaders.indexOf('physical id');
            } 
            else {
              keyIndex = headerColumnCount === 3 ? 0 : headerColumnCount === 5 ? 2 : -1;
            }
          } else if (fileType === 'holding'){
            keyIndex = headerColumnCount === 6 ? 1 : -1;
          } else if (fileType === 'user'){
            keyIndex = headerColumnCount === 1 ? 0 : -1;
          }
  
          // Validate each row (excluding the header)
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
  
            // Ensure row column count matches the header
            if (row.length !== headerColumnCount) {
              throw new Error(
                translate.instant('validateFile.error.mismatchedColumns', {
                  row: i + 1,
                  expected: headerColumnCount,
                  actual: row.length,
                })
              );
            }
  
            // If using a key index, check for duplicates
            if (keyIndex !== -1) {
              const key = row[keyIndex];
              if (seenKeys.has(key)) {
                throw new Error(
                  translate.instant('validateFile.error.duplicateKey', {
                    key,
                    row: i + 1,
                  })
                );
              }
              seenKeys.add(key);
            }
          }
  
          // If all validations pass, resolve as valid (exclude header from row count)
          resolve({ isValid: true, rowCount: rows.length - 1 });
        } catch (e) {
          resolve({ isValid: false, errorMessage: (e as Error).message });
        }
      };
  
      reader.onerror = () => {
        resolve({
          isValid: false,
          errorMessage: translate.instant('validateFile.error.fileReadError'),
        });
      };
  
      reader.readAsText(file);
    });
  }
  