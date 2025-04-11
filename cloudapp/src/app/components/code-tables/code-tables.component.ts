import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../services/configuration.service';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaginationStateService {
  public pageIndex: number = 0;
  public pageSize: number = 20;
}

interface CodeTable {
  name: string;
  sub_system: { value: string };
}

interface GroupedTables {
  sub_system: string;
  tables: CodeTable[];
}

@Component({
  selector: 'app-code-tables',
  templateUrl: './code-tables.component.html',
  styleUrls: ['./code-tables.component.scss']
})

export class CodeTablesComponent implements OnInit {
  codeTables: CodeTable[] = [];
  groupedTables: GroupedTables[] = [];
  loading: boolean = true;
  error: string = '';
  selectedTableName: string = '';
  selectedRows: any[] = [];

  // Pagination properties
  pageSize: number = 20;
  pageIndex: number = 0;

  constructor(
    private configService: ConfigService,
    private router: Router,
    private paginationState: PaginationStateService
  ) {}

  ngOnInit(): void {
    this.pageIndex = this.paginationState.pageIndex;
    this.pageSize = this.paginationState.pageSize;
    this.getCodeTables();
  }

  // Navigate back
  back(): void {
    if (!this.loading) {
      this.router.navigate(['/']);
    }
  }

  // Fetch the full list of code tables, sort them by sub_system.value,
  // then update the grouped (paginated) list.
  getCodeTables(): void {
    this.configService.getCodeTables().subscribe({
      next: (response) => {
        //console.log("Response:", response);
        this.loading = false;
        if (response?.code_table) {
          // Sort first by sub_system.value, then by name alphabetically.
          this.codeTables = response.code_table.sort((a: CodeTable, b: CodeTable) => {
            const subCompare = a.sub_system.value.localeCompare(b.sub_system.value);
            return subCompare !== 0 ? subCompare : a.name.localeCompare(b.name);
          });
          this.updateGroupedTables();
        }
      },
      error: (err) => {
        console.error("Error retrieving code tables:", err);
        this.error = "Error retrieving code tables.";
        this.loading = false;
      }
    });
  }

  // Return the flat, paginated subset of codeTables.
  get paginatedCodeTables(): CodeTable[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.codeTables.slice(startIndex, startIndex + this.pageSize);
  }

  // Group the paginated items by sub_system.
  groupBySubSystem(tables: CodeTable[]): GroupedTables[] {
    const groups: { [key: string]: CodeTable[] } = {};
    tables.forEach(table => {
      const key = table.sub_system.value;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(table);
    });
    // Convert the groups into an array and sort by sub_system key.
    return Object.keys(groups)
      .sort()
      .map(key => ({
        sub_system: key,
        tables: groups[key]
      }));
  }

  // Update the groupedTables property using the current paginated data.
  updateGroupedTables(): void {
    this.groupedTables = this.groupBySubSystem(this.paginatedCodeTables);
  }

  // Called when the paginator changes page or page size.
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paginationState.pageIndex = event.pageIndex;
    this.paginationState.pageSize = event.pageSize;
    this.updateGroupedTables();
  }

  // Retrieve the content for a given table.
  getTableContent(tableName: string): void {
    this.selectedTableName = tableName;
    this.selectedRows = [];
    this.loading = true;

    this.configService.getTableContent(tableName).subscribe({
      next: (response) => {
        //console.log("Table content response:", response);
        this.selectedRows = response?.row || [];
        this.loading = false;
      },
      error: (err) => {
        console.error("Error retrieving table content:", err);
        this.error = "Error retrieving table content.";
        this.loading = false;
      }
    });
  }

  // Close the details view and go back to the list.
  closeTableDetails(): void {
    this.selectedTableName = '';
    this.selectedRows = [];
  }
}
