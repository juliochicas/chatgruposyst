import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: 200,
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!imageUrl) return;

		let cancelled = false;

		const fetchImage = async () => {
			// Try 1: Fetch via the api instance (with auth headers)
			try {
				const { data, headers } = await api.get(imageUrl, {
					responseType: "blob",
				});
				if (cancelled) return;
				const url = window.URL.createObjectURL(
					new Blob([data], { type: headers["content-type"] })
				);
				setBlobUrl(url);
				setFetching(false);
				return;
			} catch (err) {
				console.warn("ModalImageCors: fetch directo falló, intentando endpoint de media...", err?.message);
			}

			// Try 2: Extract filename and use the dedicated /messages/media/:filename endpoint
			try {
				const filename = imageUrl.split("/public/").pop();
				if (filename) {
					const { data, headers } = await api.get(`/messages/media/${filename}`, {
						responseType: "blob",
					});
					if (cancelled) return;
					const url = window.URL.createObjectURL(
						new Blob([data], { type: headers["content-type"] })
					);
					setBlobUrl(url);
					setFetching(false);
					return;
				}
			} catch (err) {
				console.warn("ModalImageCors: endpoint de media falló", err?.message);
			}

			// Try 3: Direct fetch without auth (in case the file is publicly accessible)
			try {
				const response = await fetch(imageUrl);
				if (response.ok) {
					const blob = await response.blob();
					if (cancelled) return;
					const url = window.URL.createObjectURL(blob);
					setBlobUrl(url);
					setFetching(false);
					return;
				}
			} catch (err) {
				console.warn("ModalImageCors: fetch sin auth falló", err?.message);
			}

			if (!cancelled) {
				setError(true);
				setFetching(false);
			}
		};

		fetchImage();

		return () => {
			cancelled = true;
		};
	}, [imageUrl]);

	if (error) {
		return (
			<div
				style={{
					width: 250,
					height: 200,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#f0f0f0",
					borderRadius: 8,
					cursor: "pointer",
				}}
				onClick={() => window.open(imageUrl, "_blank")}
				title="No se pudo cargar la imagen. Haz clic para intentar abrir."
			>
				<span style={{ fontSize: 48 }}>🖼️</span>
			</div>
		);
	}

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={fetching ? imageUrl : blobUrl}
			medium={fetching ? imageUrl : blobUrl}
			large={fetching ? imageUrl : blobUrl}
			alt="image"
		/>
	);
};

export default ModalImageCors;
