import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SidebarService {
    private collapsed = signal(false);

    isCollapsed = this.collapsed.asReadonly();

    toggle() {
        this.collapsed.update(v => !v);
    }
}