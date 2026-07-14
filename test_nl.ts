import { translateNlSearch } from './backend/src/services/ai.service';

async function test() {
  const result = await translateNlSearch('attendance below 100');
  console.log(result);
}
test();
