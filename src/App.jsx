// Imports from React and AWS Amplify libraries
import { useEffect, useState } from 'react'
import {
	Authenticator,
	Button,
	Text,
	TextField,
	Heading,
	Flex,
	View,
	Image,
	Grid,
	Divider
} from '@aws-amplify/ui-react'

// AWS Amplify configuration and utilities import
import { Amplify } from 'aws-amplify'
import "@aws-amplify/ui-react/styles.css"
import { getUrl } from "aws-amplify/storage"
import { uploadData } from 'aws-amplify/storage'
import { generateClient } from "aws-amplify/data"
import outputs from "../amplify_outputs.json"

// Configure Amplify using backend outputs
Amplify.configure(outputs);

// Initialize client for interacting with models using userPool authentication
const client = generateClient({
	authMode:"userPool"
});

export default function App() {
	// State variable for storing notes
	const [notes, setNotes] = useState([]);

	// Fetch notes once when component mounts
	useEffect(() => {
		fetchNotes();
	}, []);

	// Function to fetch notes from the backend
	async function fetchNotes() {
		// Retrieve notes using the client API
		const { data:notes } = await client.models.Note.list();
		await Promise.all(
			notes.map(async note => {
				// If the note has an image, retrieve the accessible URL from storage
				if (note.image) {
					const linkToStorageFile = await getUrl({
						path: ({identityId}) => `media/${identityId}/${note}`
					});
					console.log(linkToStorageFile.url);
					note.image = linkToStorageFile.url;
				}
				return note;
			})
		);
		console.log(notes);
		// Update state with the retrieved notes
		setNotes(notes);
	}

	// Function to handle creation of a new note
	async function createNote(event) {
		event.preventDefault();
		// Extract form data
		const form = new FormData(event.target);
		console.log(form.get("image").name);
		// Create a new note on the backend with provided details
		const { data:newNote } = await client.models.Note.create({
			name: form.get("name"),
			description: form.get("description"),
			image: form.get("image").name
		});
		console.log(newNote);
		// If an image file is provided, upload it to storage
		if (form.get("image").name) {
			await uploadData({
				path: ({identityId}) => `media/${identityId}/${newNote.id}/${form.get("image").name}`,
				data: form.get("image")
			});
			// Refresh notes list after creation
			fetchNotes();
			// Reset the form
			event.target.reset();
		}
	}
	async function deleteNote({id}){
		const {data:deletedNote}=await client.models.Note.delete({id});
		console.log(deletedNote);
		fetchNotes();
	}
	return(
		<Authenticator>
			{({ signOut }) => (
				<Flex
					className="App"
					justifyContent="center"
					alignItems="center"
					direction="column"
					width="70%"
					margin="0 auto"
				>
					{/* Main title of the application */}
					<Heading level={1}>My Notes App</Heading>

					{/* Form for creating a new note */}
					<View as="form" margin="3rem 0" onSubmit={createNote}>
						<Flex
							direction="column"
							justifyContent="center"
							gap="2rem"
							padding="2rem"
						>
							{/* Input field for note name */}
							<TextField
								name="name"
								placeholder="Note Name"
								label="Note Name"
								labelHidden
								variation="quiet"
								required
							/>
							{/* Input field for note description */}
							<TextField
								name="description"
								placeholder="Note Description"
								label="Note Description"
								labelHidden
								variation="quiet"
								required
							/>
							{/* File input for note image */}
							<View
								name="image"
								as="input"
								type="file"
								alignSelf={"end"}
								accept="image/png, image/jpeg"
							/>

							{/* Button to submit the form and create a new note */}
							<Button type="submit" variation="primary">
								Create Note
							</Button>
						</Flex>
					</View>

					{/* Divider between note creation form and list of current notes */}
					<Divider />
					{/* Heading for the current notes section */}
					<Heading level={2}>Current Notes</Heading>
					{/* Grid layout to display all current notes */}
					<Grid
						margin="3rem 0"
						autoFlow="column"
						justifyContent="center"
						gap="2rem"
						alignContent="center"
					>
						{notes.map((note) => (
							<Flex
								key={note.id || note.name}
								direction="column"
								justifyContent="center"
								alignItems="center"
								gap="2rem"
								border="1px solid #ccc"
								padding="2rem"
								borderRadius="5%"
								className="box"
							>
								{/* Display note name */}
								<View>
									<Heading level="3">{note.name}</Heading>
								</View>
								{/* Display note description in italic */}
								<Text fontStyle="italic">{note.description}</Text>
								{/* If an image exists, display the note image */}
								{note.image && (
									<Image
										src={note.image}
										alt={`visual aid for ${notes.name}`}
										style={{ width: 400 }}
									/>
								)}
								{/* Button to delete the note */}
								<Button
									variation="destructive"
									onClick={() => deleteNote(note)}
								>
									Delete note
								</Button>
							</Flex>
						))}
					</Grid>

					{/* Button to sign out the authenticated user */}
					<Button onClick={signOut}>Sign Out</Button>
				</Flex>
			)}
		</Authenticator>
	)
}
