export default async function CallAPI(data:object, endpoint: string, filename?: string) {
  const requestBody = JSON.stringify({data: data});

  const subdomain = window.location.hostname.split('.')[0];
  const APICallSubdomain =
    subdomain === 'stage' ? 'stage' :
    //subdomain === 'dev' ? 'dev' :
    'shop';

  try {
//    const ApiEndpoint = process.env.API_ENDPOINT
    const response = await fetch(`https://${APICallSubdomain}.well-mill.com/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: requestBody,
    });

    if (!response.ok) {
      // Attempt to parse the error message from the response
      const responseClone = response.clone();

      try {
          const errorDataJson = await response.json();
          console.log("Error in CallAPI in json");
          console.log(errorDataJson);
          return { data: null, error: errorDataJson.error || `HTTP error. Status: ${response.status}` };
      } catch (jsonParseError) {
        try{
          // If didn't find Json error data, look for a text error message
          const errorDataText = await responseClone.text();
          //console.log("Error in CallAPI in text");
          //console.log(errorDataText);
          return { data: null, error: errorDataText };
        } catch (textParseError){
          // If parsing json AND text fails, return a generic error message
          console.log("Error in CallAPI raw data");
          console.log(response);
          return { data: null, error: `HTTP error! Status: ${response.status}` };
        }
      }
    }

    const contentType = response.headers.get('Content-Type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return { data: data, error: null };
    }

    if (contentType?.includes('application/pdf') || contentType?.includes('text/csv') || contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      // Handle file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;

      const suggestedFileName = filename || response.headers.get('Content-Disposition')?.split('filename=')[1] || (contentType.includes('csv') ? 'groupData.csv' : contentType.includes('pdf') ? "receipt.pdf" : 'groupData.xlsx');
      a.download = suggestedFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
      return { data: null, error: null };
    }

    return { data: null, error: "Unknown returned content type" };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
