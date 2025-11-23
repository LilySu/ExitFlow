import { useState, useEffect } from 'react';

export default function Home() {
  const [facilityImages, setFacilityImages] = useState([]);
  const [crowdImages, setCrowdImages] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedCrowd, setSelectedCrowd] = useState(null);
  const [scenarioA, setScenarioA] = useState(null);
  const [scenarioB, setScenarioB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);

  // Prompt states
  const [promptA, setPromptA] = useState("Show the crowd of people calmly exiting the facility through the main exit, photorealistic with natural lighting and full color. Always keep the image of just the building without people exactly the same with the image of the crowd superimposed.");
  const [promptB, setPromptB] = useState("Show the crowd of people quickly evacuating the facility through emergency exits, photorealistic with natural lighting and full color. Always keep the image of just the building without people exactly the same with the image of the crowd superimposed.");
  const [pedestrianFlowA, setPedestrianFlowA] = useState("25");
  const [pedestrianFlowB, setPedestrianFlowB] = useState("25");

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await fetch('/api/images');
      const data = await response.json();
      setFacilityImages(data.facility || []);
      setCrowdImages(data.crowd || []);

      if (data.facility?.length > 0) setSelectedFacility(data.facility[0]);
      if (data.crowd?.length > 0) setSelectedCrowd(data.crowd[0]);
    } catch (err) {
      console.error('Error loading images:', err);
    }
  };

  const handleFacilityClick = async (image) => {
    setSelectedFacility(image);

    // Auto-trigger upload when facility is clicked
    if (!scenarioA && !scenarioB && !loading) {
      await handleUpload(image, selectedCrowd);
    }
  };

  const handleUpload = async (facilityImage = selectedFacility, crowdImage = selectedCrowd) => {
    if (!facilityImage) {
      setError('Please select a facility image');
      return;
    }

    setLoading(true);
    setError(null);
    setScenarioA(null);
    setScenarioB(null);
    setUploaded(false);

    try {
      // Show uploaded state after a brief moment
      setTimeout(() => {
        setUploaded(true);
      }, 500);

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityImage: facilityImage,
          crowdImage: crowdImage,
          promptA: promptA,
          promptB: promptB,
          pedestrianFlow: parseFloat(pedestrianFlowA) || 25,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scenarios');
      }

      setScenarioA(data.scenarioA);
      setScenarioB(data.scenarioB);
    } catch (err) {
      setError(err.message);
      setUploaded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScenarioA = async () => {
    if (!selectedFacility) {
      setError('Please select a facility image');
      return;
    }

    setLoadingA(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityImage: selectedFacility,
          crowdImage: selectedCrowd,
          prompt: promptA,
          pedestrianFlow: parseFloat(pedestrianFlowA) || 25,
          scenario: 'A',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scenario A');
      }

      setScenarioA(data.image);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingA(false);
    }
  };

  const handleGenerateScenarioB = async () => {
    if (!selectedFacility) {
      setError('Please select a facility image');
      return;
    }

    setLoadingB(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityImage: selectedFacility,
          crowdImage: selectedCrowd,
          prompt: promptB,
          pedestrianFlow: parseFloat(pedestrianFlowB) || 25,
          scenario: 'B',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scenario B');
      }

      setScenarioB(data.image);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingB(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      await loadImages();

      // Auto-trigger generation if facility was uploaded
      if (type === 'facility') {
        setSelectedFacility(data.fileName);
        await handleUpload(data.fileName, selectedCrowd);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Check if scenarios have been generated
  const showScenarios = scenarioA || scenarioB;

  return (
    <div className="min-h-screen bg-gray-100 p-12">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-2">exitfloww</h1>
          <p className="text-xl text-gray-600">A simulator for evacuation exits using A/B testing techniques.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-[220px_1fr_220px] gap-8">
          {/* LEFT COLUMN - Facility Images */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Facility</h2>
            <div className="space-y-4">
              {facilityImages.map((image) => (
                <div
                  key={image}
                  onClick={() => handleFacilityClick(image)}
                  className={`${
                    selectedFacility === image
                      ? 'ring-4 ring-blue-500'
                      : 'ring-2 ring-gray-300'
                  } rounded-2xl overflow-hidden cursor-pointer transition-all hover:ring-blue-400 bg-white`}
                >
                  <img
                    src={`/api/image/facility/${image}`}
                    alt="Facility"
                    className="w-full h-32 object-cover"
                  />
                </div>
              ))}

              {/* Upload Button */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'facility')}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-gray-400 cursor-pointer transition-all bg-white">
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400 mb-2"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">Upload</p>
                </div>
              </label>
            </div>
          </div>

          {/* CENTER COLUMN - Single Placeholder OR Two Scenarios */}
          <div className="space-y-6">
            {!showScenarios ? (
              // BEFORE UPLOAD: Single Image Placeholder
              <>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden p-6">
                  <div className="relative aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                    {/* Backdrop Image - 10% when not uploaded, 100% when uploaded */}
                    {selectedFacility && (
                      <div className="absolute inset-0">
                        <img
                          src={`/api/image/facility/${selectedFacility}`}
                          alt="Facility backdrop"
                          className={`w-full h-full object-cover transition-opacity duration-500 ${
                            uploaded ? 'opacity-100' : 'opacity-10'
                          }`}
                        />
                        {/* Uploaded text overlay */}
                        {uploaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                            <div className="text-white text-center">
                              <svg
                                className="mx-auto h-12 w-12 mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <p className="text-lg font-semibold">Uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative z-10">
                      {loading && !uploaded ? (
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-2">Uploading...</p>
                        </div>
                      ) : loading && uploaded ? (
                        <div className="text-center">
                          {/* MIDgraph.gif loading animation */}
                          <img
                            src="/assets/MIDgraph.gif"
                            alt="Loading"
                            className="w-32 h-32 mx-auto"
                          />
                          <p className="text-sm text-white font-semibold mt-2">Generating scenarios...</p>
                        </div>
                      ) : !uploaded ? (
                        <div className="text-center">
                          <svg
                            className="mx-auto h-16 w-16 text-gray-400 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-gray-500 text-sm">Click a facility image to generate</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Prompt Inputs for Initial State */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Scenario A Prompt */}
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Scenario A Prompt
                      </label>
                      <textarea
                        value={promptA}
                        onChange={(e) => setPromptA(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Describe Scenario A..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pedestrian Flow
                      </label>
                      <input
                        type="number"
                        value={pedestrianFlowA}
                        onChange={(e) => setPedestrianFlowA(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="25"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-500 mt-1"><strong>persons/min/m</strong> width</p>
                    </div>
                  </div>

                  {/* Scenario B Prompt */}
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Scenario B Prompt
                      </label>
                      <textarea
                        value={promptB}
                        onChange={(e) => setPromptB(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Describe Scenario B..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pedestrian Flow
                      </label>
                      <input
                        type="number"
                        value={pedestrianFlowB}
                        onChange={(e) => setPedestrianFlowB(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="25"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-500 mt-1"><strong>persons/min/m</strong> width</p>
                    </div>
                  </div>
                </div>

                {/* Manual Upload Button */}
                <button
                  onClick={() => handleUpload()}
                  disabled={loading || !selectedFacility}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl hover:bg-blue-700 font-semibold text-xl shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </>
            ) : (
              // AFTER UPLOAD: Two Scenarios Side by Side
              <>
                <div className="grid grid-cols-2 gap-6">
                  {/* Scenario A */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-2xl font-semibold text-gray-900">Scenario A</h3>
                      <p className="text-xs text-gray-600 mt-1">Calm evacuation through main exit</p>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="relative aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                        {scenarioA ? (
                          <img
                            src={scenarioA.url}
                            alt="Scenario A"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="text-center">
                            <svg
                              className="mx-auto h-16 w-16 text-gray-400 mb-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <p className="text-gray-500 text-sm">Generated scenario</p>
                          </div>
                        )}
                        {/* Loading Overlay for Scenario A */}
                        {loadingA && (
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-xl">
                            <img
                              src="/assets/MIDgraph.gif"
                              alt="Loading"
                              className="w-32 h-32"
                            />
                          </div>
                        )}
                      </div>
                      {/* Prompt Input Below Scenario A */}
                      <textarea
                        value={promptA}
                        onChange={(e) => setPromptA(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Describe Scenario A..."
                      />
                      {/* Pedestrian Flow for Scenario A */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Pedestrian Flow
                        </label>
                        <input
                          type="number"
                          value={pedestrianFlowA}
                          onChange={(e) => setPedestrianFlowA(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="25"
                          step="0.1"
                        />
                        <p className="text-xs text-gray-500 mt-1"><strong>persons/min/m</strong> width</p>
                      </div>
                      {/* Generate Scenario A Button */}
                      <button
                        onClick={handleGenerateScenarioA}
                        disabled={loadingA || !selectedFacility}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {loadingA ? 'Generating...' : 'Generate Scenario A'}
                      </button>
                    </div>
                  </div>

                  {/* Scenario B */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-2xl font-semibold text-gray-900">Scenario B</h3>
                      <p className="text-xs text-gray-600 mt-1">Quick evacuation through emergency exits</p>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="relative aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                        {scenarioB ? (
                          <img
                            src={scenarioB.url}
                            alt="Scenario B"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="text-center">
                            <svg
                              className="mx-auto h-16 w-16 text-gray-400 mb-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <p className="text-gray-500 text-sm">Generated scenario</p>
                          </div>
                        )}
                        {/* Loading Overlay for Scenario B */}
                        {loadingB && (
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-xl">
                            <img
                              src="/assets/MIDgraph.gif"
                              alt="Loading"
                              className="w-32 h-32"
                            />
                          </div>
                        )}
                      </div>
                      {/* Prompt Input Below Scenario B */}
                      <textarea
                        value={promptB}
                        onChange={(e) => setPromptB(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Describe Scenario B..."
                      />
                      {/* Pedestrian Flow for Scenario B */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Pedestrian Flow
                        </label>
                        <input
                          type="number"
                          value={pedestrianFlowB}
                          onChange={(e) => setPedestrianFlowB(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="25"
                          step="0.1"
                        />
                        <p className="text-xs text-gray-500 mt-1"><strong>persons/min/m</strong> width</p>
                      </div>
                      {/* Generate Scenario B Button */}
                      <button
                        onClick={handleGenerateScenarioB}
                        disabled={loadingB || !selectedFacility}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {loadingB ? 'Generating...' : 'Generate Scenario B'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN - Crowd Images */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Crowd</h2>
            <div className="space-y-4">
              {crowdImages.map((image) => (
                <div
                  key={image}
                  onClick={() => setSelectedCrowd(image)}
                  className={`${
                    selectedCrowd === image
                      ? 'ring-4 ring-blue-500'
                      : 'ring-2 ring-gray-300'
                  } rounded-2xl overflow-hidden cursor-pointer transition-all hover:ring-blue-400 bg-white`}
                >
                  <img
                    src={`/api/image/crowd/${image}`}
                    alt="Crowd"
                    className="w-full h-32 object-cover"
                  />
                </div>
              ))}

              {/* Upload Button */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'crowd')}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-gray-400 cursor-pointer transition-all bg-white">
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400 mb-2"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">Optional</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
