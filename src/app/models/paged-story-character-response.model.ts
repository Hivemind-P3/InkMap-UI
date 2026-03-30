import { StoryCharacter } from './story-character.model';

export interface PagedStoryCharacterResponse {
  content: StoryCharacter[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
