"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Music, Loader2 } from 'lucide-react'

// You'll need to replace these with your actual Spotify App credentials
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI

export default function SpotifyPlaylistCreator() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState('My Liked Songs Playlist')
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check if the URL contains the access token
    const hash = window.location.hash
    if (hash) {
      const token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token'))?.split('=')[1]
      if (token) {
        setAccessToken(token)
        // Clear the hash from the URL
        window.location.hash = ''
      }
    }
  }, [])

  const handleLogin = () => {
    const scopes = 'user-library-read playlist-modify-public'
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(scopes)}&response_type=token`
  }

  const createPlaylist = async () => {
    if (!accessToken) return
  
    setIsCreating(true)
    setMessage('')
  
    try {
      // Get user ID
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const userData: { id: string } = await userResponse.json()
      const userId = userData.id
  
      // Create a new playlist
      const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlistName,
          description: 'Created from my liked songs',
          public: true
        })
      })
      const playlistData: { id: string } = await createPlaylistResponse.json()
      const playlistId = playlistData.id
  
      // Get liked songs
      let tracks: string[] = []
      let next: string | null = 'https://api.spotify.com/v1/me/tracks?limit=50'
  
      while (next) {
        const likedSongsResponse = await fetch(next, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const likedSongsData: {
          items: Array<{ track: { uri: string } }>;
          next: string | null;
        } = await likedSongsResponse.json()
        tracks = [...tracks, ...likedSongsData.items.map((item) => item.track.uri)]
        next = likedSongsData.next
      }
  
      // Add tracks to the playlist (in batches of 100)
      for (let i = 0; i < tracks.length; i += 100) {
        const batch = tracks.slice(i, i + 100)
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        })
      }
  
      setMessage(`Successfully created playlist "${playlistName}" with ${tracks.length} tracks!`)
    } catch (error) {
      console.error('Error creating playlist:', error)
      setMessage('An error occurred while creating the playlist. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            Spotify Playlist Creator
          </CardTitle>
          <CardDescription>Convert your liked songs into a playlist</CardDescription>
        </CardHeader>
        <CardContent>
          {!accessToken ? (
            <Button onClick={handleLogin} className="w-full">
              Login with Spotify
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Enter playlist name"
                />
              </div>
              <Button onClick={createPlaylist} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Playlist...
                  </>
                ) : (
                  'Create Playlist'
                )}
              </Button>
            </div>
          )}
        </CardContent>
        {message && (
          <CardFooter>
            <p className="text-sm text-center w-full">{message}</p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}