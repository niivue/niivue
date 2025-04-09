export function base64ToJson(base64String) {
  try {
    const decodedString = atob(base64String);
    const jsonObject = JSON.parse(decodedString);
    return jsonObject;
  } catch (error) {
    console.error("Error converting Base64 to JSON:", error);
    return null;
  }
}
