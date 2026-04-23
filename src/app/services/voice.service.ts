import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  transcribe(blob: Blob): Observable<{ text: string }> {
    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    return this.http.post<{ text: string }>(`${this.baseUrl}/voice/transcribe`, form);
  }
}
