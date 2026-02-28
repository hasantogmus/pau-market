using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ListingsController(IListingService listingService, IPhotoService photoService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetAll()
    {
        var listings = await listingService.GetAllListingsAsync();
        return Ok(listings);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ListingResponseDto>> GetById(int id)
    {
        var listing = await listingService.GetListingByIdAsync(id);

        if (listing == null)
            return NotFound(new { message = "İlan bulunamadı." });

        return Ok(listing);
    }

    [HttpPost]
    public async Task<ActionResult<ListingResponseDto>> Create([FromForm] CreateListingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Upload photo to Cloudinary
        var imageUrl = await photoService.AddPhotoAsync(dto.Image);
        
        if (string.IsNullOrEmpty(imageUrl))
            return BadRequest(new { message = "Fotoğraf yüklenemedi." });

        var createdListing = await listingService.CreateListingAsync(dto, imageUrl);
        return CreatedAtAction(nameof(GetById), new { id = createdListing.Id }, createdListing);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ListingResponseDto>> Update(int id, UpdateListingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updatedListing = await listingService.UpdateListingAsync(id, dto);

        if (updatedListing == null)
            return NotFound(new { message = "İlan bulunamadı." });

        return Ok(updatedListing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await listingService.DeleteListingAsync(id);

        if (!result)
            return NotFound(new { message = "İlan bulunamadı." });

        return NoContent();
    }
}
