import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProcessDataService {

  constructor(private http: HttpClient) { }

  // PHP endpoint URL
  private apiUrl = 'https://cgalma-sgbc.csuc.cat/cloudApp/saveInfluxDB.php'; 

  // Send the process data to the PHP backend
  sendProcessData(processData: any): Observable<any> {
    return this.http.post(this.apiUrl, processData);
  }
}
