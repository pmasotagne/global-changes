import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { ConfigurationComponent } from './components/configuration/configuration.component'
import { MainComponent } from './components/main/main.component'
import { ModificarExemplarComponent } from './components/items/modify-items/modify-items.component'
import { MoveFieldItemsComponent } from './components/items/move-fields/move-field-items.component'
import { SplitFieldItemsComponent } from './components/items/split-fields/split-field-items.component'
import { CreateItemsInBulk } from './components/items/create-items/create-items.component'
import { ClonePOLinesComponent } from './components/acquisitions/clone-po-lines/clone-POLines.component'
import { ModifyPOLinesComponent } from './components/acquisitions/modify-po-lines/modify-po-lines.component'
import { CodeTablesComponent } from './components/code-tables/code-tables.component'
import { ModifyHoldingsComponent } from './components/holdings/modify-holdings/modify-holdings.component'
import { RemoveUsersComponent } from './components/users/remove-users/remove-users.component'

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'config', component: ConfigurationComponent },
  { path: 'main', component: MainComponent },
  { path: 'modify-items', component: ModificarExemplarComponent },
  { path: 'move-field-items', component: MoveFieldItemsComponent },
  { path: 'split-field-items', component: SplitFieldItemsComponent },
  { path: 'create-items', component: CreateItemsInBulk },
  { path: 'clone-POLines', component: ClonePOLinesComponent },
  { path: 'modify-po-lines', component: ModifyPOLinesComponent },
  { path: 'code-tables', component: CodeTablesComponent },
  { path: 'modify-holdings', component: ModifyHoldingsComponent },
  { path: 'remove-users', component: RemoveUsersComponent }
]

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
