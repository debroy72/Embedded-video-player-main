document.addEventListener('DOMContentLoaded', function () {
  const video = document.getElementById('video');
  const subtitleContainer = document.getElementById('subtitle-container');
  let subtitles = [];
  let clickedWordsWithTimestamp = [];
  let videoCount = 0; // Counter to keep track of the number of videos watched

  video.addEventListener('loadedmetadata', function () {
    fetch('/captions/captions.srt')
      .then(response => response.text())
      .then(data => {
        subtitles = parseSRT(data);
      });
  });

  video.addEventListener('timeupdate', function () {
    updateSubtitle();
  });

  subtitleContainer.addEventListener('mousedown', function (event) {
    const clickedWord = event.target.closest('.word');
    if (clickedWord) {
      clickedWord.classList.toggle('clicked-word');
      updateClickedWords();
    }
  });

  video.addEventListener('ended', function () {
    const userNameInput = document.getElementById('user-name');
    const userName = userNameInput.value.trim();

    if (userName !== '') {
      // Increment the video count
      videoCount++;

      // Retrieve the video name from the video file
      const videoName = getVideoName(video);

      // Generate and download the CSV file with user name, video details, clicked words, and timestamps
      generateCSVFile(userName, videoCount, videoName, clickedWordsWithTimestamp);
    } else {
      alert('Please enter your name.');
    }
  });

  function getVideoName(videoElement) {
    const videoFile = videoElement.currentSrc;
    const videoName = new URL(videoFile).pathname.split('/').pop();
    return videoName;
  }

  function updateSubtitle() {
    const currentTime = video.currentTime;
    let subtitleText = '';

    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
        subtitleText = subtitle.text;
        break;
      }
    }

    subtitleContainer.innerHTML = subtitleText
      .split(/\b(\w+)\b/g)
      .map(word => {
        return word.match(/\b(\w+)\b/) ? `<span class="word">${word}</span>` : word;
      })
      .join('');
  }

  function updateClickedWords() {
    const currentTime = video.currentTime;
    const newlyClickedWords = Array.from(document.querySelectorAll('.word.clicked-word')).map(word => {
      const timestamp = formatTime(currentTime);
      return { word: word.textContent.trim(), timestamp };
    });

    clickedWordsWithTimestamp = clickedWordsWithTimestamp.concat(newlyClickedWords);
  }

  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.round(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function parseSRT(srtData) {
    const subtitleLines = srtData.split('\n\n');
    const subtitleObjects = [];

    subtitleLines.forEach(line => {
      const lines = line.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const time = lines[1].split(' --> ');
        const startTime = convertTimeToSeconds(time[0]);
        const endTime = convertTimeToSeconds(time[1]);
        const text = lines.slice(2).join('\n').trim();

        subtitleObjects.push({
          index,
          startTime,
          endTime,
          text
        });
      }
    });

    return subtitleObjects;
  }

  function convertTimeToSeconds(timeString) {
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseFloat(timeParts[2].replace(',', '.'));

    return hours * 3600 + minutes * 60 + seconds;
  }

  function generateCSVFile(userName, videoCount, videoName, wordsWithTimestamp) {
    const fileName = `${userName}_video${videoCount}_${videoName}_clicked_word_detail.csv`;
    const header = 'User Name,Video Count,Video Name,Word,Timestamp\n';
    const csvContent = header + wordsWithTimestamp.map(entry => `${userName},${videoCount},${videoName},${entry.word},${entry.timestamp}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  }
});
