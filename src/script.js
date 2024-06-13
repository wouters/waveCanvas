// =============================================================================
class AudioPlayer 
{    
    // --------------------------------
    constructor(el, options) {

        // options
        this.color1 = options.color1 || '#94096e';
        this.color2 = options.color2 || '#00516c';
        this.colorBG = options.colorBG || '#1c1a28';

        // if the element is an ul element, create a container div
        // and move the ul element inside it
        if(el.tagName == "UL"){
            this.container = document.createElement('div'); // create a div element
            this.container.classList.add('waveCanvas'); // add the waveCanvas class to the container
            el.classList.remove('waveCanvas'); // remove the waveCanvas class from the ul element
            el.classList.add('playlist'); // add the playlist class to the ul element
            el.parentNode.insertBefore(this.container, el); // insert the container before the ul element
            this.container.appendChild(el); // append the ul element to the container
            this.container.innerHTML = `<audio class="audio" controls></audio>` + this.container.innerHTML; // add an audio element to the container
            this.audio = this.container.querySelector('.audio'); // get the audio element
            }

        // If the element is an audio element, create a container div
        // and move the audio element inside it
        // Otherwise, use the element as the container
        else if(el.tagName == "AUDIO"){
            this.container = document.createElement('div'); // create a div element
            this.container.classList.add('waveCanvas'); // add the waveCanvas class to the container
            el.classList.remove('waveCanvas'); // remove the waveCanvas class from the audio element
            el.parentNode.insertBefore(this.container, el); // insert the container before the audio element
            this.container.appendChild(el); // append the audio element to the container
            this.audio = el; // get the audio element
            }

        // Otherwise, use the element as the container
        else{
            this.container = el;

            if(!this.container.querySelector('audio')){
                this.container.innerHTML = `<audio class="audio" controls></audio>` + this.container.innerHTML;
                }
            
            this.audio = this.container.querySelector('.audio');
            }
        

        // CREATE THE CONTROLS
        var controls = `
            <div class="controls">
            <button class="play-pause"></button>
            <div class="seek-bar-container">
                <canvas class="waveform" width="2400px" height="256px" style="width: 100%; height: 128px;"></canvas>
                <input type="range" class="seek-bar" min="0" max="100" value="0">
                <div class="seek-bar-progress"></div>
                <div class="tooltip"></div>
            </div>
            <div class="remaining">00:00</div>
            </div>`;

        // insert controls after the audio element
        this.audio.insertAdjacentHTML('afterend', controls);

        this.playPauseButton = this.container.querySelector('.play-pause');
        this.seekBarContainer = this.container.querySelector('.seek-bar-container');

        this.seekBar = this.container.querySelector('.seek-bar');
        this.seekBarProgress = this.container.querySelector('.seek-bar-progress');
        this.remainingDisplay = this.container.querySelector('.remaining');
        this.tooltip = this.container.querySelector('.tooltip');

        // WAVEFORM
        // only visible if the audio element has a data-waveform attribute
        this.waveform = this.container.querySelector('.waveform');
        this.waveformData = null;

        // PLAYLIST
        this.playlistElement = this.container.querySelector('.playlist') || null;
        if(this.playlistElement){
            this.container.classList.add('hasPlaylist');
            this.playlistItems = this.playlistElement.querySelectorAll('li');
            this.playlistCurrent = null;
            this.playlistItems[0].classList.add('playing');
            }

        // IF NO AUDIO IS SET IN THE AUDIO DIRECTLY AND
        // PLAYLIST IS SET THEN LOAD FIRST ITEM
        if( this.playlistElement && this.playlistItems.length > 0 ){
            const firstTrack = this.playlistItems[0];
            this.playlistCurrent = 0;

            if (!this.audio.src) {
                const firstFile = firstTrack.querySelector('a').getAttribute('href');
                this.audio.src = firstFile;
                }

            // no audio waveform set in the audio element
            if (!this.audio.hasAttribute('data-waveform') && firstTrack.hasAttribute('data-waveform') ) {
                const firstWaveform = firstTrack.getAttribute('data-waveform');
                this.audio.setAttribute( 'data-waveform', firstWaveform);
                }
            }

        // store the hover progress
        this.currentHoverProgress = null;

        //
        if (this.audio.hasAttribute('data-waveform') && this.audio.getAttribute('data-waveform') !== ''){
            this.container.classList.add('waveform');
            this.waveformFile = this.audio.getAttribute('data-waveform');
            this.plotWaveform(this.waveformFile);
            }

        this.addEventListeners();
        }

    // --------------------------------
    addEventListeners() {
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
        this.audio.addEventListener('timeupdate', () => this.updateTime());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());

        this.audio.addEventListener('play', () => this.handleAudioPlaying());
        this.audio.addEventListener('pause', () => this.handleAudioPaused());
        this.audio.addEventListener('ended', () => this.handleAudioEnded());

        this.seekBar.addEventListener('input', () => this.seek());
        this.seekBar.addEventListener('mousemove', (e) => this.showTooltip(e));
        this.seekBar.addEventListener('mouseleave', () => this.hideTooltip());

        if(this.playlistElement){
            this.playlistItems.forEach((item, index) => {
                item.addEventListener('click', () => this.clickPlaylist(index));
                });
            }

        // add event listener for the waveform
        if (this.waveform) {

            // click event
            this.waveform.addEventListener('click', (event) => {
                const rect = this.waveform.getBoundingClientRect();
                const offsetX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
                const progress = offsetX / rect.width;
                this.audio.currentTime = this.audio.duration * progress;

                this.stopAllPlayers();
                this.audio.play();
                });

            this.waveform.addEventListener('mousemove', (event) => {
                this.isHoveringWaveform = true;
                this.handleWaveformHover(event);
                });

            this.waveform.addEventListener('mouseleave', () => {
                this.isHoveringWaveform = false;
                this.handleWaveformHoverEnd();
                });
            }
        // Use requestAnimationFrame for smoother updates
        this.rafId = null;
        const update = () => {
            this.updateTime();
            this.rafId = requestAnimationFrame(update);
        };
        update();
        }

    // --------------------------------
    // Handle waveform hover
    handleWaveformHover(event) {
        const rect = this.waveform.getBoundingClientRect();
        const offsetX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
        this.currentHoverProgress = offsetX / rect.width;
        this.updateWaveform(this.audio.currentTime / this.audio.duration, this.currentHoverProgress);
    }


    // --------------------------------
    // Handle waveform hover end
    handleWaveformHoverEnd() {
        this.currentHoverProgress = null;
        this.updateWaveform(this.audio.currentTime / this.audio.duration);
    }
    
    // --------------------------------
    // Click playlist
    // This function is called when a playlist item is clicked
    clickPlaylist(index) {
        event.preventDefault(); // Stop default behavior
        const track = this.playlistItems[index];
        const audioSrc = track.querySelector('a').getAttribute('href');

        this.playlistCurrent = index;

        // REMOVE ALL PLAYLING CLASSES
        this.playlistItems.forEach(item => {
            item.classList.remove('playing');
            });

        // WAVEFORM
        this.waveformFile = track.getAttribute('data-waveform') || null;
        if(this.waveformFile){
            this.audio.setAttribute('data-waveform', this.waveformFile);
            this.plotWaveform(this.waveformFile);
            this.container.classList.add('waveform');
            }
        else{
            this.container.classList.remove('waveform');
            }

        // CURRENT ITEM ADD CLASS
        this.playlistItems[index].classList.add('playing');
        this.audio.src = audioSrc;
        this.stopAllPlayers();
        this.audio.play();
        }

    // --------------------------------
    handleAudioPlaying(){
        this.playPauseButton.classList.add('playing');
        }

    // --------------------------------
    handleAudioPaused(){
        this.playPauseButton.classList.remove('playing');
        }
    
    // --------------------------------
    handleAudioEnded() {
        if (this.playlistElement && this.playlistCurrent !== null && this.playlistCurrent < this.playlistItems.length - 1) {
            this.playlistCurrent++;
            const nextTrack = this.playlistItems[this.playlistCurrent];
            const audioSrc = nextTrack.querySelector('a').getAttribute('href');
            this.playlistItems.forEach(item => {
                item.classList.remove('playing');
                });
            this.playlistItems[this.playlistCurrent].classList.add('playing');
            this.audio.src = audioSrc;
            this.stopAllPlayers();
            this.audio.play();
        }
        else{
            this.playPauseButton.classList.remove('playing');
            this.audio.currentTime = 0;
            }
        }

    // --------------------------------
    togglePlayPause() {
        if (this.audio.readyState === 4) {
            if (this.audio.paused) {
                this.stopAllPlayers();
                this.audio.play();
                }
            else {
                this.audio.pause();
                }
            }
        }

    // --------------------------------
    updateTime() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        const progress = (currentTime / duration) * 100;
        const progressBar = progress + ((100 - progress) * 0.01);

        if (!isNaN(duration)) {
            this.remainingDisplay.textContent = this.formatTime(duration - currentTime);
            this.seekBar.value = progress;
            this.seekBarProgress.style.width = `${progressBar}%`;
        }

        // Update the waveform overlay
        if (this.waveform) {
            this.updateWaveform(currentTime / duration, this.currentHoverProgress);
        }
    }


    // --------------------------------
    // Update duration
    // This function updates the duration display
    updateDuration() {
        this.remainingDisplay.textContent = this.formatTime(this.audio.duration);
        }

    // --------------------------------
    // Seek
    // This function seeks to a specific time in the audio
    seek() {
        const seekTo = this.audio.duration * (this.seekBar.value / 100);
        if (!isNaN(seekTo) && seekTo < this.audio.duration) { this.audio.currentTime = seekTo; }
        }

    // --------------------------------
    // Format time
    // This function takes a number of seconds and returns a string in the format MM:SS
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

    // --------------------------------
    // Show the tooltip
    // This function shows the tooltip when the user hovers over the seek bar
    showTooltip(event) {
        if (isNaN(this.audio.duration)) { return; }
        const rect = this.seekBar.getBoundingClientRect();
        const offsetX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
        const hoverTime = (offsetX / rect.width) * this.audio.duration;
        this.tooltip.style.left = `${offsetX}px`;
        this.tooltip.textContent = this.formatTime(hoverTime);
        this.tooltip.style.display = 'block';
        }

    // --------------------------------
    // Hide the tooltip
    // This function hides the tooltip when the mouse leaves the seek bar
    hideTooltip() {
        this.tooltip.style.display = 'none';
        }

    // --------------------------------
    // Stop all players
    // This function stops all audio and video elements on the page
    stopAllPlayers(){
        const mediaElements = document.querySelectorAll('audio, video');
        
        mediaElements.forEach(element => { 
            

            if (element !== this.audio) { element.pause(); }
            // element.pause(); 
            });
        }

    // --------------------------------
    // Plot the waveform
    // This function fetches the waveform data from a JSON file
    plotWaveform(file) {
        fetch(file)
            .then(response => response.json())
            .then(data => {
                this.waveformData = data.data;
                this.updateWaveform(0);
            })
            .catch(error => {
                console.error('Error fetching waveform data:', error);
            });
        }

    // --------------------------------
    // Update the waveform
    // This function is called every time the audio time updates
    updateWaveform(progress, hoverProgress = null) {
        const ctx = this.waveform.getContext('2d');
        ctx.clearRect(0, 0, this.waveform.width, this.waveform.height);

        if (!this.waveformData) return;

        const width = this.waveform.width;
        const height = this.waveform.height;
        const step = width / this.waveformData.length;

        const progressIndex = Math.floor(this.waveformData.length * progress);

        const colorBG    = 'rgba(28, 26, 40, 1)';

        const progressGradient = ctx.createLinearGradient(0, 0, 0, height);
        progressGradient.addColorStop(0, this.color1);
        progressGradient.addColorStop((height * 0.5) / height, this.color1);
        progressGradient.addColorStop(1, 'rgba(255, 255, 255, .2)');

        const hoverGradient = ctx.createLinearGradient(0, 0, 0, height);
        hoverGradient.addColorStop(0, this.color2);
        hoverGradient.addColorStop((height * 0.5 ) / height, this.color2);
        hoverGradient.addColorStop(1, 'rgba(255, 255, 255, .2)');

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, colorBG);
        gradient.addColorStop((height * 0.5) / height, colorBG);
        gradient.addColorStop(1, 'rgba(255, 255, 255, .2)');


        if (hoverProgress !== null) {
            const hoverIndex = Math.floor(this.waveformData.length * hoverProgress);

            if (hoverProgress < progress) {
                // Draw hover part
                ctx.beginPath();
                ctx.moveTo(0, height / 2);

                for (let i = 0; i < hoverIndex; i++) {
                    const x = i * step;
                    const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                    ctx.lineTo(x, y);
                }

                ctx.strokeStyle = progressGradient;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw progress part
                ctx.beginPath();
                ctx.moveTo(hoverIndex * step, height / 2);

                for (let i = hoverIndex; i < progressIndex; i++) {
                    const x = i * step;
                    const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                    ctx.lineTo(x, y);
                }

                ctx.strokeStyle = hoverGradient;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                // Draw progress part
                ctx.beginPath();
                ctx.moveTo(0, height / 2);

                for (let i = 0; i < progressIndex; i++) {
                    const x = i * step;
                    const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                    ctx.lineTo(x, y);
                }

                ctx.strokeStyle = progressGradient;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw hover part
                ctx.beginPath();
                ctx.moveTo(progressIndex * step, height / 2);

                for (let i = progressIndex; i < hoverIndex; i++) {
                    const x = i * step;
                    const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                    ctx.lineTo(x, y);
                }

                ctx.strokeStyle = hoverGradient;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw remaining part
            ctx.beginPath();
            ctx.moveTo(Math.max(hoverIndex, progressIndex) * step, height / 2);

            for (let i = Math.max(hoverIndex, progressIndex); i < this.waveformData.length; i++) {
                const x = i * step;
                const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                ctx.lineTo(x, y);
            }

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Draw progress part
            ctx.beginPath();
            ctx.moveTo(0, height / 2);

            for (let i = 0; i < progressIndex; i++) {
                const x = i * step;
                const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                ctx.lineTo(x, y);
            }

            ctx.strokeStyle = progressGradient;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw remaining part
            ctx.beginPath();
            ctx.moveTo(progressIndex * step, height / 2);

            for (let i = progressIndex; i < this.waveformData.length; i++) {
                const x = i * step;
                const y = height / 2 - (this.waveformData[i] / 32768) * height / 2;
                ctx.lineTo(x, y);
            }

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // --------------------------------
}
