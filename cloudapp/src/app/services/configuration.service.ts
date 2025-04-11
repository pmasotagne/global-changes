import { Injectable } from '@angular/core';
import { CloudAppRestService, HttpMethod, Request } from '@exlibris/exl-cloudapp-angular-lib';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ConfigService {
    constructor(private restService: CloudAppRestService) { }


  private institutionCodeSource = new BehaviorSubject<string>('');
  currentInstitutionCode = this.institutionCodeSource.asObservable();

  setInstitutionCode(code: string) {
    this.institutionCodeSource.next(code);
  }

  createEmptySet(name: string, content: string): Observable<any> {
      const xmlSet = `
          <set>
          <name>${this.escapeXml(name)}</name>
          <description>Set automàtic - API</description>
          <type>ITEMIZED</type>
          <content>${this.escapeXml(content)}</content>
          <private>false</private>
          <status>ACTIVE</status>
          <note></note>
          <query></query>
          <members></members>
          <origin>UI</origin>
          </set>
      `;

      const request: Request = {
          url: `/almaws/v1/conf/sets`,
          method: HttpMethod.POST,
          requestBody: xmlSet,
      };

      return this.restService.call(request);
  }

  getSet(setID: string){
      const request: Request = {
          url: `/almaws/v1/conf/sets/${setID}/members`,
          method: HttpMethod.GET
      };
      
      return this.restService.call(request);
  }

  addMembersToSet(setID: string,updatedPhysicalIds: string[], set: any){
      if (!set.members) {
          set.members = {};
      }
      
      set.members.member = [];

      updatedPhysicalIds.forEach(id => {
          
          const member = {
              link: 'string',
              id: id,
              description: ''
          };
          
          set.members.member.push(member);
      });
      
      const request: Request = {
          url: `/almaws/v1/conf/sets/${setID}`,
          method: HttpMethod.POST,
          requestBody: set,
          queryParams: { op: 'add_members' }
      };

      return this.restService.call(request);
  }


  private escapeXml(unsafe: string): string {
      return unsafe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
  }

  getCodeTables() : Observable<any> {
      let url: string;
  
      url = '/almaws/v1/conf/code-tables';
      
      const request: Request = {
        url,
        method: HttpMethod.GET,
      };
    
      return this.restService.call(request);
  }

  getTableContent(tableName: string) : Observable<any> {
      let url: string;
  
      url = `/almaws/v1/conf/code-tables/${tableName}`;
      
      const request: Request = {
        url,
        method: HttpMethod.GET,
      };
    
      return this.restService.call(request);
  }

  testAPI(): Observable<string> {
      const url = '/almaws/v1/bibs/test';
      const request: Request = {
        url,
        method: HttpMethod.GET,
        headers: {
          Accept: 'application/xml'
        },
      };
      return this.restService.call(request);
    }          
}
