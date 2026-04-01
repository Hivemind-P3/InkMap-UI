import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SidebarService {
    private collapsed = signal(true);

    isCollapsed = this.collapsed.asReadonly();

    toggle() {
        this.collapsed.update(v => !v);
    }
}