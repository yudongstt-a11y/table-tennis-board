import { saveEventTimelineData } from "./dataRepository.js";

export async function saveTimeline(items) {
  return saveEventTimelineData(items);
}
