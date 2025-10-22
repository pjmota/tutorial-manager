import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Tutorial } from '@app/_models/tutorial';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private readonly baseUrl = `${environment.apiUrl}/tutorials`;

  constructor(private readonly http: HttpClient) { }

  getAll(): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(this.baseUrl);
  }

  get(id: number): Observable<Tutorial> {
    return this.http.get<Tutorial>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Tutorial>): Observable<Tutorial> {
    return this.http.post<Tutorial>(this.baseUrl, data);
  }

  update(id: number, data: Partial<Tutorial>): Observable<Tutorial> {
    return this.http.put<Tutorial>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }

  findByTitle(title: string): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(`${this.baseUrl}`, { params: { title } });
  }
}
