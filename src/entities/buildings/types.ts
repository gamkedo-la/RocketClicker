export interface Building {
  id: string;
  name: string;
  building_cost: Record<string, number>;

  input: Record<string, number>;
  output: Record<string, number>;
}
