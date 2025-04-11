import { ConfigService } from '../services/configuration.service';

export function createSet(
    nameSet: string,
    content: string,
    configService: ConfigService
): Promise<{ id: string; set: any }> {
    return new Promise((resolve, reject) => {
        configService.createEmptySet(nameSet, content).subscribe(
            response => {
                console.log('Set created:', response.id);
                resolve({ id: response.id, set: response });
            },
            error => {
                console.error('Error creating set:', error);
                reject(error);
            }
        );
    });
}

export function addMembersToSet(
    setId: string,
    memberIds: string[],
    set: any,
    configService: ConfigService
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!setId || memberIds.length === 0) {
        const err = 'No set ID or no members to add.';
        console.error(err);
        reject(new Error(err));
        return;
      }
    
      configService.addMembersToSet(setId, memberIds, set).subscribe(
        response => {
          console.log('Members added to set:', response);
          resolve(response);
        },
        error => {
          console.error('Error adding members to set:', error);
          reject(error);
        }
      );
    });
  }
  