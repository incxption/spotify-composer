import React, { useCallback, useEffect, useState } from "react"
import { AnimatePresence, useMotionValue, motion } from "framer-motion"
import SongDragOverlay from "@components/composer/song/SongDragOverlay"
import SongDetails from "@components/composer/song/SongDetails"
import SongBackground from "@components/composer/song/SongBackground"
import useAsync from "@utils/useAsync"
import { Playlist, Song } from "@typedefs/spotify"
import { collectSongs, SongLoadingState } from "@spotify/playlists"
import SongAudioPreview from "@components/composer/song/SongAudioPreview"
import SongAudioControls from "@components/composer/song/SongAudioControls"
import LoadingScreen from "@components/composer/LoadingScreen"

interface Props {
    includedPlaylists: Playlist[]
    setIncludedSongs: (songs: Song[]) => void
}

const SongPicker: React.FC<Props> = ({ includedPlaylists, setIncludedSongs }) => {
    const [loadingState, setLoadingState] = useState<SongLoadingState>()
    const loadSongs = useCallback(() => collectSongs(includedPlaylists, setLoadingState), [includedPlaylists])
    const { result: songs, state } = useAsync(loadSongs)

    const [index, setIndex] = useState(0)
    const [taken, setTaken] = useState<Song[]>([])

    const x = useMotionValue(0)

    const [targetVolume, setTargetVolume] = useState(readFromLocalStorage() ?? 0.15)
    const setVolume = (value: number) => {
        writeToLocalStorage(value)
        setTargetVolume(value)
    }

    useEffect(() => {
        if (state === "done" && index === songs!.length) {
            setIncludedSongs(taken)
        }
    }, [state, index, songs, setIncludedSongs, taken])

    function next() {
        setIndex(index + 1)
    }

    function take() {
        setTaken([...taken, currentSong!])
        next()
    }

    function handleDragEnd() {
        if (x.get() > 30) take()
        else if (x.get() < -30) next()
    }

    const currentSong = songs && songs[index]

    return (
        <div className="w-full flex-grow overflow-hidden flex">
            <AnimatePresence>
                {
                    currentSong && songs ?
                        <motion.div
                            className="w-full flex-grow flex overflow-hidden relative"
                            animate={{ y: 0, opacity: 1 }} initial={{ y: "100%", opacity: 0 }}
                            transition={{ duration: .6, ease: "easeInOut", bounce: .5 }}
                            key="picker"
                        >
                            <SongAudioPreview currentSong={currentSong} key={currentSong.track.id} targetVolume={targetVolume}/>
                            <SongAudioControls volume={targetVolume} setVolume={setVolume}/>

                            <SongDragOverlay x={x} onDragEnd={handleDragEnd}/>
                            <SongDetails x={x} currentSong={currentSong} left={songs.length - index}/>

                            <SongBackground currentSong={currentSong}/>
                        </motion.div>
                        :
                        <LoadingScreen
                            title={loadingState?.playlist?.name}
                            message={loadingState && `${loadingState.songs} unique songs`}
                        />
                }
            </AnimatePresence>
        </div>
    )
}

function writeToLocalStorage(volume: number) {
    localStorage.setItem("volume", String(volume))
}

function readFromLocalStorage(): number | null {
    const item = localStorage.getItem("volume")
    if (item) {
        const number = parseInt(item)
        return isNaN(number) ? null : number
    } else return null
}

export default SongPicker
