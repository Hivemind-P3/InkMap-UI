export interface StoryCharacter {
  id: number;
  name: string;
  role?: string;
  description?: string;
  age?: number | null;
  gender?: string;
  race?: string;
  createdAt?: string;
}

export interface CreateCharacterRequest {
  name: string;
  role?: string;
  description?: string;
  age?: number | null;
  gender: string;
  race?: string;
}

export interface CharacterPreview {
  name: string;
  role?: string;
  description?: string;
  age?: number | null;
  gender?: string;
  race?: string;
}
